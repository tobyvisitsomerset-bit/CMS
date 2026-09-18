import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MembershipTier, Page, PageStatus } from "@prisma/client";
import { parseCustomFields, getBusinessInfo } from "@/lib/kentico-item-fields";

export type PageTreeNode = Pick<
  Page,
  "id" | "title" | "slug" | "isSection" | "status" | "parentId" | "sortOrder" | "assignedMemberId" | "linkedPageId"
> & { children: PageTreeNode[] };

function buildTree(rows: Omit<PageTreeNode, "children">[]): PageTreeNode[] {
  const byId = new Map<string, PageTreeNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: PageTreeNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: PageTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

export async function getFullPageTree(): Promise<PageTreeNode[]> {
  const rows = await prisma.page.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      isSection: true,
      status: true,
      parentId: true,
      sortOrder: true,
      assignedMemberId: true,
      linkedPageId: true,
    },
  });
  return buildTree(rows);
}

export async function getAssignedPageTree(userId: string): Promise<PageTreeNode[]> {
  const rows = await prisma.page.findMany({
    where: { assignedMemberId: userId },
    select: {
      id: true,
      title: true,
      slug: true,
      isSection: true,
      status: true,
      parentId: true,
      sortOrder: true,
      assignedMemberId: true,
      linkedPageId: true,
    },
  });
  // Flatten: members see their own pages as top-level entries regardless of real parent.
  return rows
    .map((r) => ({ ...r, parentId: null, children: [] as PageTreeNode[] }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function getPageById(id: string) {
  return prisma.page.findUnique({
    where: { id },
    include: {
      author: true,
      owner: true,
      assignedMember: true,
      tags: true,
      categories: true,
      contentBlocks: { orderBy: { sortOrder: "asc" } },
      rooms: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { sortOrder: "asc" } },
    },
  });
}

// Public-site lookup by slug — cached per-request so generateMetadata and
// the page body (which both need the same page) don't issue two queries.
export const getPageBySlug = cache(async (slug: string) => {
  return prisma.page.findUnique({
    where: { slug },
    include: {
      author: true,
      owner: true,
      assignedMember: true,
      tags: true,
      categories: true,
      contentBlocks: { orderBy: { sortOrder: "asc" } },
      rooms: { orderBy: { sortOrder: "asc" } },
      reviews: { orderBy: { sortOrder: "asc" } },
    },
  });
});

// Real sibling pages under the same parent, for a "Nearby, worth the trip"
// style section — no separate recommendation data exists, so this is the
// closest real signal we have.
export async function getNearbyPages(pageId: string, parentId: string | null, limit = 4) {
  if (!parentId) return [];
  return prisma.page.findMany({
    where: {
      parentId,
      id: { not: pageId },
      isSection: false,
      linkedPageId: null,
      status: "PUBLISHED",
    },
    select: { id: true, title: true, slug: true, heroImageUrl: true },
    take: limit,
    orderBy: { sortOrder: "asc" },
  });
}

export type ChildPageTile = { id: string; title: string; subtitle: string | null; slug: string; heroImageUrl: string | null };

// Real child pages of a "folder"-style page (real children, no ContentBlocks,
// no recognized business data) — lets PagePreview show a real section-index
// grid instead of a bare title. Mirrors getNearbyPages' shape/exclusions.
//
// Filters out genuine dead-end tiles: a handful of the original hand-seeded
// demo sub-pages (e.g. "Hotels", "B&Bs" under Places To Stay) still exist
// with zero children, zero content, and zero business data of their own —
// often sitting right next to the real Kentico folder of the same name,
// which collided on slug at import time and got suffixed (e.g. "hotels-296").
// A tile that leads to a genuinely empty page is worse than no tile.
export async function getChildPages(parentId: string): Promise<ChildPageTile[]> {
  const rows = await prisma.page.findMany({
    where: { parentId, status: "PUBLISHED", linkedPageId: null },
    select: {
      id: true,
      title: true,
      subtitle: true,
      slug: true,
      heroImageUrl: true,
      bodyContent: true,
      customFields: true,
      _count: { select: { children: true, contentBlocks: true } },
    },
    orderBy: { sortOrder: "asc" },
    take: 100,
  });
  return rows
    .filter((r) => {
      const isDeadEnd =
        r._count.children === 0 &&
        r._count.contentBlocks === 0 &&
        !r.bodyContent &&
        !getBusinessInfo(parseCustomFields(r.customFields));
      return !isDeadEnd;
    })
    .map(({ id, title, subtitle, slug, heroImageUrl }) => ({ id, title, subtitle, slug, heroImageUrl }));
}

// Real per-nav-item children for the header mega-menu (Phase 10) — reuses
// getChildPages verbatim. Only nav items whose real child count is small and
// section-like (2-12) get a dropdown; a 0/1-child item has nothing worth
// showing, and a very large count (e.g. Festivals & Events' hundreds of
// direct real events, not clean categories) would make an unusable menu —
// so those items simply stay plain links, no manual per-item allowlist needed.
export async function getNavMenus(slugs: string[]): Promise<Record<string, ChildPageTile[]>> {
  const roots = await prisma.page.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const entries = await Promise.all(
    roots.map(async (root): Promise<[string, ChildPageTile[]]> => {
      const children = await getChildPages(root.id);
      return [root.slug, children.length >= 2 && children.length <= 12 ? children : []];
    }),
  );
  return Object.fromEntries(entries);
}

export type FeaturedPageTile = { id: string; title: string; subtitle: string | null; slug: string; heroImageUrl: string | null };

// Real accommodation businesses for the homepage teaser (Phase 9 — replaces
// the mock Listing table). Prefers pages with a real photo (only ~3% of real
// business pages have one) so the teaser looks its best, backfilling with
// photo-less ones if not enough exist. No rating/price shown — that data
// doesn't exist for real pages.
export async function getFeaturedRealBusinesses(rootSlug: string, limit: number): Promise<FeaturedPageTile[]> {
  const select = { id: true, title: true, subtitle: true, slug: true, heroImageUrl: true } as const;
  const where = { status: "PUBLISHED" as const, slug: { startsWith: `${rootSlug}/` }, customFields: { contains: "sz.touristitem" } };
  const withImage = await prisma.page.findMany({ where: { ...where, heroImageUrl: { not: null } }, select, take: limit, orderBy: { sortOrder: "asc" } });
  if (withImage.length >= limit) return withImage;
  const rest = await prisma.page.findMany({
    where: { ...where, heroImageUrl: null, id: { notIn: withImage.map((p) => p.id) } },
    select,
    take: limit - withImage.length,
    orderBy: { sortOrder: "asc" },
  });
  return [...withImage, ...rest];
}

// Real upcoming festivals/events, sorted by real ItemStartDate — parsed in
// JS via getBusinessInfo(), same pattern as getPagesWithCoordinates below
// (a JSON-string customFields column can't be filtered/sorted by date in SQL).
export async function getUpcomingRealEvents(rootSlug: string, limit: number): Promise<FeaturedPageTile[]> {
  const rows = await prisma.page.findMany({
    where: { status: "PUBLISHED", slug: { startsWith: `${rootSlug}/` }, customFields: { contains: "sz.touristitem" } },
    select: { id: true, title: true, subtitle: true, slug: true, heroImageUrl: true, customFields: true },
  });
  const now = Date.now();
  return rows
    .map((r) => ({ ...r, startDate: getBusinessInfo(parseCustomFields(r.customFields))?.startDate }))
    .filter((r): r is typeof r & { startDate: string } => !!r.startDate && new Date(r.startDate).getTime() >= now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, limit)
    .map(({ id, title, subtitle, slug, heroImageUrl }) => ({ id, title, subtitle, slug, heroImageUrl }));
}

export type PageMapPin = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  lat: number;
  lng: number;
  category: string;
};

// Loose UK+Ireland bounding box. A handful of real Kentico rows (~14 of
// 3,560, spot-checked directly) carry corrupted ItemMapLatitude/Longitude
// values — swapped lat/lng, a stray extra digit, or in one case genuinely
// unrelated US coordinates — which would otherwise plot pins in Africa or
// the Atlantic on a "Somerset" map. The field mapping itself is correct
// (verified against known-good rows like Cheddar Gorge); this only excludes
// the small number of rows whose source values are themselves wrong.
const UK_BOUNDS = { minLat: 49, maxLat: 61, minLng: -11, maxLng: 2 };

// Real per-page coordinates for the interactive map (Phase 3) — only source
// of real geo data in this app; the mock `Listing` model has none. Coordinates
// live inside `customFields` (ItemMapLatitude/ItemMapLongitude), not a native
// column, so they can't be filtered in SQL and must be parsed in application
// code, same as `getBusinessInfo()` already does for the business detail page.
export const getPagesWithCoordinates = cache(async (): Promise<PageMapPin[]> => {
  const rows = await prisma.page.findMany({
    where: { status: "PUBLISHED", customFields: { not: null } },
    select: { id: true, title: true, slug: true, heroImageUrl: true, customFields: true },
  });

  const pins: PageMapPin[] = [];
  for (const row of rows) {
    const fields = parseCustomFields(row.customFields);
    const lat = fields.ItemMapLatitude ? Number(fields.ItemMapLatitude) : null;
    const lng = fields.ItemMapLongitude ? Number(fields.ItemMapLongitude) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat! < UK_BOUNDS.minLat || lat! > UK_BOUNDS.maxLat || lng! < UK_BOUNDS.minLng || lng! > UK_BOUNDS.maxLng) continue;
    pins.push({
      id: row.id,
      title: row.title,
      slug: row.slug,
      heroImageUrl: row.heroImageUrl,
      lat: lat as number,
      lng: lng as number,
      category: row.slug.split("/")[0],
    });
  }
  return pins;
});

export type SocialLink = { platform: string; url: string };

// Real imported sz.sociallink pages (children of "Social Links"). 4 of the 7
// real rows are the primary Visit Somerset account; the other 3 are a
// district partner ("Visit Taunton") account, out of place in global chrome.
export const getSocialLinks = cache(async (): Promise<SocialLink[]> => {
  const rows = await prisma.page.findMany({
    where: { slug: { startsWith: "site-content/social-links/" }, status: "PUBLISHED", title: { contains: "Visit Somerset" } },
    select: { customFields: true },
  });

  const links: SocialLink[] = [];
  for (const row of rows) {
    const fields = parseCustomFields(row.customFields);
    if (fields.SocialLink && fields.SocialLinkIcon) {
      links.push({ platform: fields.SocialLinkIcon, url: fields.SocialLink });
    }
  }
  return links;
});

export type ExploreAreaTile = { label: string; href: string; count: number; description: string };

// The homepage's "Explore by area" tile row — an honest substitute for the
// mockup pack's "Somerset by mood" tiles, which would need a real Category/Tag
// taxonomy that doesn't exist (both tables are empty). Real counts only, all
// sourced from real Pages. Food & Drink and Festivals & Events point at the
// real branches Phase 8 discovered (things-to-do/food-drink-more and
// festivals-events) rather than their empty, now-archived former hub roots.
const EXPLORE_AREAS: { label: string; slug: string; href: string; noun: (n: number) => string }[] = [
  { label: "Places To Stay", slug: "places-to-stay", href: "/places-to-stay", noun: (n) => `${n} places to stay` },
  { label: "Things To Do", slug: "things-to-do", href: "/things-to-do", noun: (n) => `${n} things to do` },
  { label: "Food & Drink", slug: "things-to-do/food-drink-more", href: "/things-to-do/food-drink-more", noun: (n) => `${n} places to eat & drink` },
  { label: "Festivals & Events", slug: "festivals-events", href: "/festivals-events", noun: (n) => `${n} upcoming events` },
  { label: "Discover Somerset", slug: "discover-somerset", href: "/discover-somerset", noun: (n) => `${n} pages of inspiration` },
  { label: "City of Bath", slug: "bath", href: "/bath", noun: (n) => `${n} pages about Bath` },
  { label: "Taunton", slug: "taunton", href: "/taunton", noun: (n) => `${n} pages about Taunton` },
];

export const getExploreAreaTiles = cache(async (): Promise<ExploreAreaTile[]> => {
  return Promise.all(
    EXPLORE_AREAS.map(async (area) => {
      const count = await prisma.page.count({
        where: { status: "PUBLISHED", OR: [{ slug: area.slug }, { slug: { startsWith: `${area.slug}/` } }] },
      });
      return { label: area.label, href: area.href, count, description: area.noun(count) };
    }),
  );
});

export type TownTile = { id: string; title: string; slug: string; heroImageUrl: string | null };

const TOWN_PAGES = [
  { name: "Bath", slug: "discover-somerset/popular-somerset-towns/bath" },
  { name: "Wells", slug: "discover-somerset/popular-somerset-towns/visiting-wells-in-somerset" },
  { name: "Glastonbury", slug: "discover-somerset/popular-somerset-towns/glastonbury" },
  { name: "Weston-super-Mare", slug: "discover-somerset/popular-somerset-towns/visiting-weston-super-mare" },
] as const;

// Real town overview pages plus Taunton, which has no equivalent nested
// overview — points at its real root /taunton page instead rather than a
// fabricated URL.
export const getTownOverviewPages = cache(async (): Promise<TownTile[]> => {
  const rows = await prisma.page.findMany({
    where: { slug: { in: TOWN_PAGES.map((t) => t.slug) }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, heroImageUrl: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  const towns = TOWN_PAGES.map((t) => bySlug.get(t.slug)).filter((r): r is NonNullable<typeof r> => !!r);
  return [...towns, { id: "taunton", title: "Taunton", slug: "taunton", heroImageUrl: null }];
});

export async function searchPages(query: string) {
  return prisma.page.findMany({
    where: { title: { contains: query, mode: "insensitive" } },
    select: { id: true, title: true, slug: true, status: true, isSection: true },
    take: 25,
  });
}

export async function createPage(input: {
  title: string;
  parentId: string | null;
  isSection: boolean;
  authorId: string;
  ownerId: string;
}) {
  const siblingCount = await prisma.page.count({ where: { parentId: input.parentId } });
  const slugPrefix = input.parentId
    ? (await prisma.page.findUnique({ where: { id: input.parentId } }))?.slug ?? ""
    : "";
  const baseSlug = input.title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const slug = slugPrefix ? `${slugPrefix}/${baseSlug}` : baseSlug;

  return prisma.page.create({
    data: {
      title: input.title,
      slug: `${slug}-${Date.now().toString(36)}`,
      parentId: input.parentId,
      isSection: input.isSection,
      sortOrder: siblingCount,
      authorId: input.authorId,
      ownerId: input.ownerId,
      status: "DRAFT",
    },
  });
}

export async function updatePage(
  id: string,
  data: Partial<{
    title: string;
    subtitle: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    slug: string;
    heroImageUrl: string | null;
    galleryUrls: string | null;
    bodyContent: string | null;
    callToActionLabel: string | null;
    callToActionUrl: string | null;
    customFields: string | null;
    assignedMemberId: string | null;
    assignedTeam: string | null;
    visibility: string;
    publishDate: Date | null;
    expiryDate: Date | null;
    tagline: string | null;
    membershipTier: MembershipTier | null;
  }>,
) {
  return prisma.page.update({ where: { id }, data });
}

function slugifyLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function setPageTagsAndCategories(id: string, tagNames: string[], categoryNames: string[]) {
  const tags = await Promise.all(
    tagNames.filter(Boolean).map((name) =>
      prisma.tag.upsert({
        where: { name },
        update: {},
        create: { name, slug: slugifyLabel(name) },
      }),
    ),
  );
  const categories = await Promise.all(
    categoryNames.filter(Boolean).map((name) =>
      prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, slug: slugifyLabel(name) },
      }),
    ),
  );

  return prisma.page.update({
    where: { id },
    data: {
      tags: { set: tags.map((t) => ({ id: t.id })) },
      categories: { set: categories.map((c) => ({ id: c.id })) },
    },
  });
}

export async function setPageStatus(id: string, status: PageStatus) {
  const data: { status: PageStatus; publishDate?: Date; archivedAt?: Date | null } = { status };
  if (status === "PUBLISHED") data.publishDate = new Date();
  if (status === "ARCHIVED") data.archivedAt = new Date();
  if (status === "DRAFT" || status === "PENDING_APPROVAL") data.archivedAt = null;
  return prisma.page.update({ where: { id }, data });
}

export async function clonePage(id: string) {
  const original = await prisma.page.findUnique({ where: { id } });
  if (!original) throw new Error("Page not found");
  const siblingCount = await prisma.page.count({ where: { parentId: original.parentId } });
  return prisma.page.create({
    data: {
      title: `${original.title} (Copy)`,
      subtitle: original.subtitle,
      slug: `${original.slug}-copy-${Date.now().toString(36)}`,
      seoTitle: original.seoTitle,
      seoDescription: original.seoDescription,
      heroImageUrl: original.heroImageUrl,
      galleryUrls: original.galleryUrls,
      bodyContent: original.bodyContent,
      callToActionLabel: original.callToActionLabel,
      callToActionUrl: original.callToActionUrl,
      customFields: original.customFields,
      isSection: original.isSection,
      parentId: original.parentId,
      sortOrder: siblingCount,
      authorId: original.authorId,
      ownerId: original.ownerId,
      status: "DRAFT",
    },
  });
}

export async function deletePage(id: string) {
  return prisma.page.delete({ where: { id } });
}

export async function reorderPage(id: string, parentId: string | null, sortOrder: number) {
  return prisma.page.update({ where: { id }, data: { parentId, sortOrder } });
}
