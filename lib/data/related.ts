import { prisma } from "@/lib/prisma";

export type RelatedTile = { id: string; title: string; subtitle: string | null; slug: string; heroImageUrl: string | null };

// Published pages an editor picked under Properties > Related pages.
export async function getRelatedTiles(pageId: string): Promise<RelatedTile[]> {
  const rows = await prisma.pageRelation.findMany({
    where: { fromId: pageId, to: { status: "PUBLISHED", linkedPageId: null } },
    orderBy: { sortOrder: "asc" },
    take: 12,
    select: { to: { select: { id: true, title: true, subtitle: true, slug: true, heroImageUrl: true } } },
  });
  return rows.map((r) => r.to);
}
