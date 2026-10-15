import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toLevel } from "@/lib/membership";
import { createLinkedPage } from "@/lib/data/pages";

// "Where you appear": a listing can also be shown on other landing pages
// (Animals, Family fun, Outdoor adventures...). A placement is a linked page
// under that landing page, which the landing page's list already includes,
// so nothing is duplicated and the original stays the one real page.
//
// How many extra landing pages a member may choose depends on their level.
// This is in addition to the section the page already sits in.

export const PLACEMENT_CAPS = { GROWTH: 1, PARTNER: 4, PREMIUM: 8 } as const;

export function placementCap(tier: string | null | undefined): number {
  const level = toLevel(tier);
  return level ? PLACEMENT_CAPS[level] : 0;
}

export type LandingOption = { id: string; title: string; context: string; slug: string };

async function loadLandings(): Promise<LandingOption[]> {
  const rows = await prisma.page.findMany({
    where: { status: "PUBLISHED", linkedPageId: null, contentBlocks: { some: { type: "listing_explorer" } } },
    select: { id: true, title: true, slug: true, parent: { select: { title: true } } },
    orderBy: { title: "asc" },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, slug: r.slug, context: r.parent?.title ?? "" }));
}

/** Every landing page (a page with a listing explorer on it). */
export const getLandingOptions = unstable_cache(loadLandings, ["landing-options"], { revalidate: 600, tags: ["listings"] });

/** Landing pages above this page in the tree: where it already sits. */
export async function homeLandingIds(pageId: string): Promise<string[]> {
  const out: string[] = [];
  const first = await prisma.page.findUnique({ where: { id: pageId }, select: { parentId: true } });
  let cur = first?.parentId ?? null;
  for (let d = 0; cur && d < 8; d++) {
    const p = await prisma.page.findUnique({
      where: { id: cur },
      select: { parentId: true, contentBlocks: { where: { type: "listing_explorer" }, select: { id: true } } },
    });
    if (!p) break;
    if (p.contentBlocks.length > 0) out.push(cur);
    cur = p.parentId;
  }
  return out;
}

/** Landing pages this page has been placed on (links under landing pages). */
export async function placementsFor(pageId: string): Promise<string[]> {
  const landings = new Set((await loadLandings()).map((l) => l.id));
  const links = await prisma.page.findMany({ where: { linkedPageId: pageId }, select: { parentId: true } });
  return links.map((l) => l.parentId).filter((p): p is string => !!p && landings.has(p));
}

/**
 * Makes the page's placements exactly `wanted` (landing page ids), creating
 * and removing links. `cap` limits how many are kept (members); staff pass null.
 */
export async function setPlacements(pageId: string, wanted: string[], authorId: string, cap: number | null) {
  const landings = new Map((await loadLandings()).map((l) => [l.id, l]));
  const home = new Set(await homeLandingIds(pageId));
  let target = Array.from(new Set(wanted)).filter((id) => landings.has(id) && id !== pageId && !home.has(id));
  if (cap != null) target = target.slice(0, cap);

  const existing = await prisma.page.findMany({
    where: { linkedPageId: pageId, parentId: { in: [...landings.keys()] } },
    select: { id: true, parentId: true },
  });
  const have = new Set(existing.map((e) => e.parentId as string));

  for (const e of existing) {
    if (!target.includes(e.parentId as string)) await prisma.page.delete({ where: { id: e.id } });
  }
  for (const id of target) {
    if (have.has(id)) continue;
    try {
      await createLinkedPage({ targetId: pageId, parentId: id, authorId });
    } catch {
      // Already there under another route, or a loop: skip it.
    }
  }
  return target;
}
