import { prisma } from "@/lib/prisma";
import type { ExploreAreaTile, TownTile } from "@/lib/data/pages";
import { getFeaturedRealBusinesses, getUpcomingRealEvents } from "@/lib/data/pages";
import type { RealBlockData } from "@/components/cms/page-builder/block-renderer";

type BlockLike = { id: string; type: string; config: string };

async function resolveExploreAreaTiles(
  areas: { label: string; rootSlug: string; href: string; noun: string }[],
): Promise<ExploreAreaTile[]> {
  return Promise.all(
    areas.map(async (area) => {
      const count = await prisma.page.count({
        where: { status: "PUBLISHED", OR: [{ slug: area.rootSlug }, { slug: { startsWith: `${area.rootSlug}/` } }] },
      });
      return { label: area.label, href: area.href, count, description: `${count} ${area.noun}` };
    }),
  );
}

async function resolveTownsRow(towns: { title: string; slug: string }[]): Promise<TownTile[]> {
  const rows = await prisma.page.findMany({
    where: { slug: { in: towns.map((t) => t.slug) }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, heroImageUrl: true },
  });
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return towns
    .map((t) => {
      const real = bySlug.get(t.slug);
      if (!real) return null;
      // Prefer the block's own display title (e.g. "City of Bath") over the
      // real page's own title (e.g. "Bath"), since it's editor-authored copy.
      return { ...real, title: t.title || real.title };
    })
    .filter((t): t is TownTile => !!t);
}

// Real per-block data for Phase 10's homepage widget blocks — resolved once
// upfront per page render (same "fetch once, pass down flat" pattern
// `getAllListingsGrouped()` already established for `listings`), keyed by
// block id since each instance's own config decides what real data it needs.
// BlockRenderer itself stays synchronous — it never fetches.
export async function resolveBlockData(blocks: BlockLike[]): Promise<Record<string, RealBlockData>> {
  const entries = await Promise.all(
    blocks.map(async (block): Promise<[string, RealBlockData] | null> => {
      const config = JSON.parse(block.config || "{}");
      switch (block.type) {
        case "explore_area_tiles":
          return [block.id, { type: "explore_area_tiles", tiles: await resolveExploreAreaTiles(config.areas ?? []) }];
        case "real_teaser": {
          const limit = Number(config.limit) || 4;
          const items =
            config.mode === "businesses"
              ? await getFeaturedRealBusinesses(config.rootSlug ?? "", limit)
              : await getUpcomingRealEvents(config.rootSlug ?? "", limit);
          return [block.id, { type: "real_teaser", items }];
        }
        case "towns_row":
          return [block.id, { type: "towns_row", towns: await resolveTownsRow(config.towns ?? []) }];
        default:
          return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e): e is [string, RealBlockData] => !!e));
}
