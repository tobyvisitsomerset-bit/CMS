import { prisma } from "@/lib/prisma";
import { getItineraryPool } from "@/lib/data/itinerary-pool";
import { INTERESTS, type PoolItem } from "@/lib/itinerary";
import { priorityOf } from "@/lib/membership";

// "Recommended for you": suggestions from what the visitor has told us or
// saved themselves, and nothing else. The interests they ticked in their last
// itinerary, the kinds of place they saved, and the access needs they chose.
// No browsing history, nothing hidden, easy to explain.

export type Recommendation = { item: PoolItem; reason: string };

export async function getRecommendations(userId: string, limit = 6): Promise<Recommendation[]> {
  const [pool, tripsRow, lastItinerary] = await Promise.all([
    getItineraryPool(),
    prisma.userTrips.findUnique({ where: { userId } }),
    prisma.itinerary.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" }, select: { prefs: true } }),
  ]);

  const saved = new Set<string>();
  try {
    const store = tripsRow ? JSON.parse(tripsRow.data) : null;
    for (const t of store?.trips ?? []) for (const i of t.items ?? []) saved.add(String(i.id));
  } catch {
    /* ignore */
  }

  let interests: string[] = [];
  let access: string[] = [];
  let dog = false;
  try {
    const prefs = lastItinerary ? JSON.parse(lastItinerary.prefs) : null;
    interests = Array.isArray(prefs?.interests) ? prefs.interests : [];
    access = Array.isArray(prefs?.access) ? prefs.access : [];
    dog = !!prefs?.dog;
  } catch {
    /* ignore */
  }

  // Kinds of place they have saved, so suggestions lean the same way.
  const savedKinds = new Map<string, number>();
  for (const p of pool) if (saved.has(p.id)) savedKinds.set(p.kind, (savedKinds.get(p.kind) ?? 0) + 1);

  const today = new Date().toISOString().slice(0, 10);
  const scored: { item: PoolItem; score: number; reason: string }[] = [];
  for (const item of pool) {
    if (saved.has(item.id)) continue;
    if (item.kind === "event" && (item.endDate ?? item.startDate ?? "") < today) continue;
    if (access.length > 0 && !access.every((a) => item.access.includes(a))) continue;
    let score = priorityOf(item.level) + (item.imageUrl ? 2 : 0);
    let reason = "Popular with Visit Somerset members";
    for (const key of interests) {
      const words = INTERESTS.find((i) => i.key === key)?.words ?? [];
      if (words.some((w) => item.text.includes(w))) {
        score += 10;
        reason = `Because you like ${INTERESTS.find((i) => i.key === key)?.label.toLowerCase()}`;
      }
    }
    if (dog && item.access.includes("dogFriendly")) {
      score += 6;
      reason = "Dog friendly";
    }
    if (savedKinds.has(item.kind)) score += 2;
    if (!item.imageUrl) continue; // recommendations are picture-led
    scored.push({ item, score, reason });
  }

  scored.sort((a, b) => b.score - a.score);
  // A little variety: at most two of the same kind in the top picks.
  const out: Recommendation[] = [];
  const perKind = new Map<string, number>();
  for (const s of scored) {
    const n = perKind.get(s.item.kind) ?? 0;
    if (n >= 2) continue;
    perKind.set(s.item.kind, n + 1);
    out.push({ item: s.item, reason: s.reason });
    if (out.length >= limit) break;
  }
  return out;
}
