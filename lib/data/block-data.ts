import { prisma } from "@/lib/prisma";
import type { ExploreAreaTile, TownTile } from "@/lib/data/pages";
import {
  getPagesWithCoordinates,
  countPlacesMatching,
  countRealBusinesses,
  getFeaturedRealBusinesses,
  getUpcomingRealEvents,
} from "@/lib/data/pages";
import { queryExplorer, type ExplorerKind, type ExplorerParams } from "@/lib/data/listing-explorer";
import { getShopProducers } from "@/lib/data/shop";
import { getExperiencesHub } from "@/lib/data/experiences";
import type { RealBlockData } from "@/components/cms/page-builder/block-renderer";

type BlockLike = { id: string; type: string; config: string };
export type RawSearchParams = Record<string, string | string[] | undefined>;

async function resolveExploreAreaTiles(
  areas: { label: string; rootSlug: string; href: string; noun: string }[],
): Promise<ExploreAreaTile[]> {
  return Promise.all(
    areas.map(async (area) => {
      const count = await prisma.page.count({
        where: { status: "PUBLISHED", linkedPageId: null, OR: [{ slug: area.rootSlug }, { slug: { startsWith: `${area.rootSlug}/` } }] },
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

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function flatten(sp: RawSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(sp)) out[k] = first(v);
  return out;
}

async function findPageBySlugTitle(rootSlug: string, titleContains: string) {
  const row = await prisma.page.findFirst({
    where: {
      status: "PUBLISHED",
      linkedPageId: null,
      slug: { startsWith: `${rootSlug}/` },
      title: { contains: titleContains, mode: "insensitive" },
    },
    select: { title: true, slug: true, subtitle: true, bodyContent: true },
    orderBy: { sortOrder: "asc" },
  });
  return row;
}

// Real per-block data for widget blocks — resolved once upfront per page
// render (same "fetch once, pass down flat" pattern `getAllListingsGrouped()`
// established for `listings`), keyed by block id since each instance's own
// config decides what real data it needs. BlockRenderer itself stays
// synchronous — it never fetches. `searchParams` feeds the listing
// explorers (filters/sort/pagination are plain URL params).
export async function resolveBlockData(
  blocks: BlockLike[],
  searchParams: RawSearchParams = {},
): Promise<Record<string, RealBlockData>> {
  const sp = flatten(searchParams);
  const entries = await Promise.all(
    blocks.map(async (block): Promise<[string, RealBlockData] | null> => {
      const config = JSON.parse(block.config || "{}");
      switch (block.type) {
        case "explore_area_tiles":
          return [block.id, { type: "explore_area_tiles", tiles: await resolveExploreAreaTiles(config.areas ?? []) }];
        case "real_teaser": {
          const limit = Number(config.limit) || 4;
          const rootSlug = config.rootSlug ?? "";
          const isBusinesses = config.mode === "businesses";
          const [items, total] = await Promise.all([
            isBusinesses ? getFeaturedRealBusinesses(rootSlug, limit) : getUpcomingRealEvents(rootSlug, limit),
            isBusinesses ? countRealBusinesses(rootSlug) : Promise.resolve(0),
          ]);
          return [block.id, { type: "real_teaser", items, total }];
        }
        case "towns_row":
          return [block.id, { type: "towns_row", towns: await resolveTownsRow(config.towns ?? []) }];
        case "mood_tiles": {
          const moods: { label: string; query: string }[] = config.moods ?? [];
          const resolved = await Promise.all(
            moods.map(async (m) => ({ label: m.label, query: m.query, count: await countPlacesMatching(m.query) })),
          );
          return [block.id, { type: "mood_tiles", moods: resolved }];
        }
        case "listing_explorer": {
          const kind = (config.kind ?? "accommodation") as ExplorerKind;
          const rootSlug: string = config.rootSlug ?? "";
          const params: ExplorerParams = {
            q: sp.q,
            type: sp.type,
            town: sp.town,
            sort: sp.sort,
            page: sp.page ? Number(sp.page) || 1 : 1,
            when: sp.when,
            day: sp.day,
            free: !!sp.free,
            graded: !!sp.graded,
            bookable: !!sp.bookable,
            featured: !!sp.featured,
          };
          const [result, submit, carnival] = await Promise.all([
            queryExplorer(kind, rootSlug, params),
            kind === "events" ? findPageBySlugTitle(rootSlug, "Submit") : Promise.resolve(null),
            kind === "events" ? findPageBySlugTitle(rootSlug, "Carnival") : Promise.resolve(null),
          ]);
          return [
            block.id,
            {
              type: "listing_explorer",
              kind,
              result,
              searchParams: sp,
              submitHref: submit ? `/${submit.slug}` : null,
              carnival: carnival
                ? { title: carnival.title, summary: carnival.subtitle, href: `/${carnival.slug}` }
                : null,
            },
          ];
        }
        case "map_band": {
          const all = await getPagesWithCoordinates();
          // A representative, deterministic sample: the highest-tier members first.
          const rank: Record<string, number> = { PLATINUM: 0, GOLD: 1, SILVER: 2, BRONZE: 3 };
          const sample = all
            .filter((p) => p.isBusiness && !p.startDate)
            .sort((a, b) => (rank[a.tier ?? ""] ?? 4) - (rank[b.tier ?? ""] ?? 4))
            .slice(0, 60)
            .map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, title: p.title, href: `/${p.slug}` }));
          return [block.id, { type: "map_band", pins: sample }];
        }
        case "partners_row":
          return [
            block.id,
            {
              type: "partners_row",
              items: await getFeaturedRealBusinesses(config.rootSlug || "things-to-do/food-drink-more", Number(config.limit) || 6),
            },
          ];
        case "producer_shop":
          return [block.id, { type: "producer_shop", producers: await getShopProducers(config.rootSlug || "virtual-highstreet") }];
        case "experiences_hub":
          return [
            block.id,
            {
              type: "experiences_hub",
              hub: await getExperiencesHub({ q: sp.q, town: sp.town, page: sp.page ? Number(sp.page) || 1 : 1, sort: sp.sort }),
              searchParams: sp,
            },
          ];
        default:
          return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e): e is [string, RealBlockData] => !!e));
}
