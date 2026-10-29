import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Kentico's "Listing" mode: the pages directly under the selected page, as a
// table with a name filter, "show all levels", a page type filter and paging.

export const PAGE_TYPE_FILTERS = [
  { value: "all", label: "(all)" },
  { value: "page", label: "Page (menu item)" },
  { value: "listing", label: "Listing (business, attraction, event)" },
  { value: "folder", label: "Folder" },
  { value: "news", label: "News and blog posts" },
  { value: "itinerary", label: "Itinerary" },
] as const;

export type PageTypeFilter = (typeof PAGE_TYPE_FILTERS)[number]["value"];

export type ListingParams = {
  nameOp: "contains" | "equals" | "startsWith";
  name: string;
  allLevels: boolean;
  pageType: PageTypeFilter;
  page: number;
  pageSize: number;
};

export type ListingRow = {
  id: string;
  title: string;
  status: string;
  pageType: string;
  hasChildren: boolean;
  modifiedAt: string;
  published: boolean;
  version: number | null;
  linked: boolean;
};

const CLASS_BY_FILTER: Record<Exclude<PageTypeFilter, "all" | "folder">, string[]> = {
  page: ["cms.menuitem"],
  listing: ["sz.touristitem"],
  news: ["cms.news", "cms.blogpost", "cms.blog", "cms.blogmonth"],
  itinerary: ["sz.itinerary", "sz.itineraryday"],
};

const TYPE_LABEL: Record<string, string> = {
  "cms.menuitem": "Page (menu item)",
  "sz.touristitem": "Listing",
  "cms.folder": "Folder",
  "cms.news": "News item",
  "cms.blogpost": "Blog post",
  "cms.blog": "Blog",
  "cms.blogmonth": "Blog month",
  "sz.itinerary": "Itinerary",
  "sz.itineraryday": "Itinerary day",
  "sz.card": "Card",
  "sz.ambassador": "Ambassador",
  "sz.business": "Business",
  "sz.ad": "Advert",
  "sz.sociallink": "Social link",
};

function pageTypeOf(customFields: string | null, isSection: boolean): string {
  const cls = (customFields ?? "").match(/"key":"_kenticoClassName","value":"([^"]+)"/)?.[1];
  if (cls) return TYPE_LABEL[cls] ?? cls;
  return isSection ? "Folder" : "Page (menu item)";
}

export async function listChildPages(parentId: string, params: ListingParams): Promise<{ rows: ListingRow[]; total: number }> {
  const where: Prisma.PageWhereInput = {};
  if (params.allLevels) {
    const ids = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE t AS (
        SELECT id FROM "Page" WHERE "parentId" = ${parentId}
        UNION ALL
        SELECT p.id FROM "Page" p JOIN t ON p."parentId" = t.id
      )
      SELECT id FROM t LIMIT 5000`);
    where.id = { in: ids.map((i) => i.id) };
  } else {
    where.parentId = parentId;
  }

  const name = params.name.trim();
  if (name) {
    where.title =
      params.nameOp === "equals"
        ? { equals: name, mode: "insensitive" }
        : params.nameOp === "startsWith"
          ? { startsWith: name, mode: "insensitive" }
          : { contains: name, mode: "insensitive" };
  }

  if (params.pageType === "folder") {
    where.OR = [{ isSection: true }, { customFields: { contains: '"value":"cms.folder"' } }];
  } else if (params.pageType !== "all") {
    where.OR = CLASS_BY_FILTER[params.pageType].map((c) => ({ customFields: { contains: `"value":"${c}"` } }));
  }

  const pageSize = Math.min(100, Math.max(5, params.pageSize));
  const [total, pages] = await Promise.all([
    prisma.page.count({ where }),
    prisma.page.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      skip: Math.max(0, params.page) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        status: true,
        isSection: true,
        linkedPageId: true,
        updatedAt: true,
        customFields: true,
        _count: { select: { children: true } },
      },
    }),
  ]);

  const versions = pages.length
    ? await prisma.version.groupBy({ by: ["pageId"], where: { pageId: { in: pages.map((p) => p.id) } }, _max: { versionNumber: true } })
    : [];
  const versionOf = new Map(versions.map((v) => [v.pageId, v._max.versionNumber]));

  return {
    total,
    rows: pages.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      pageType: pageTypeOf(p.customFields, p.isSection),
      hasChildren: p._count.children > 0,
      modifiedAt: p.updatedAt.toISOString(),
      published: p.status === "PUBLISHED",
      version: versionOf.get(p.id) ?? null,
      linked: !!p.linkedPageId,
    })),
  };
}
