import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { MembershipTier, Page, PageStatus } from "@prisma/client";
import { parseCustomFields } from "@/lib/kentico-item-fields";

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
// taxonomy that doesn't exist (both tables are empty). Real counts only: five
// of these sections are genuinely Page-backed, but Food & Drink and Festivals
// & Events currently have no real editorial Pages under them at all (just the
// empty hub shell) — their real content lives in the mock Listing table, so
// those two count Listing rows instead. Different source, same honesty.
const EXPLORE_AREAS: {
  label: string;
  slug: string;
  href: string;
  source: "pages" | "listings";
  noun: (n: number) => string;
}[] = [
  { label: "Places To Stay", slug: "places-to-stay", href: "/places-to-stay", source: "pages", noun: (n) => `${n} places to stay` },
  { label: "Things To Do", slug: "things-to-do", href: "/things-to-do", source: "pages", noun: (n) => `${n} things to do` },
  { label: "Food & Drink", slug: "food-and-drink", href: "/food-and-drink", source: "listings", noun: (n) => `${n} places to eat & drink` },
  { label: "Festivals & Events", slug: "festivals-and-events", href: "/festivals-and-events", source: "listings", noun: (n) => `${n} upcoming events` },
  { label: "Discover Somerset", slug: "discover-somerset", href: "/discover-somerset", source: "pages", noun: (n) => `${n} pages of inspiration` },
  { label: "City of Bath", slug: "bath", href: "/bath", source: "pages", noun: (n) => `${n} pages about Bath` },
  { label: "Taunton", slug: "taunton", href: "/taunton", source: "pages", noun: (n) => `${n} pages about Taunton` },
];

export const getExploreAreaTiles = cache(async (): Promise<ExploreAreaTile[]> => {
  return Promise.all(
    EXPLORE_AREAS.map(async (area) => {
      const count =
        area.source === "pages"
          ? await prisma.page.count({
              where: { status: "PUBLISHED", OR: [{ slug: area.slug }, { slug: { startsWith: `${area.slug}/` } }] },
            })
          : await prisma.listing.count({ where: { category: area.slug === "food-and-drink" ? "FOOD_DRINK" : "EVENT" } });
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
