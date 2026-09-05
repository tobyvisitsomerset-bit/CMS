import { prisma } from "@/lib/prisma";
import type { MembershipTier, Page, PageStatus } from "@prisma/client";

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
