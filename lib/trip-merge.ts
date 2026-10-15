import type { Trip, TripItem, TripStore } from "@/lib/trip-storage";

// Brings together the trips kept on this device and the ones saved to a
// visitor's account, so signing in on a new device never loses anything.
// Items are matched by page id; a day or note set on either side is kept.

function mergeItems(a: TripItem[], b: TripItem[]): TripItem[] {
  const byId = new Map<string, TripItem>();
  for (const item of [...a, ...b]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    byId.set(item.id, {
      ...existing,
      day: existing.day ?? item.day ?? null,
      note: existing.note || item.note || "",
      addedAt: Math.min(existing.addedAt, item.addedAt),
    });
  }
  return [...byId.values()].sort((x, y) => x.addedAt - y.addedAt);
}

export function mergeStores(local: TripStore, remote: TripStore | null): TripStore {
  if (!remote || remote.trips.length === 0) return local;
  const byId = new Map<string, Trip>();
  for (const t of [...remote.trips, ...local.trips]) {
    const existing = byId.get(t.id);
    byId.set(
      t.id,
      existing
        ? {
            ...existing,
            ...t,
            name: t.name || existing.name,
            startDate: t.startDate ?? existing.startDate ?? null,
            endDate: t.endDate ?? existing.endDate ?? null,
            guests: t.guests ?? existing.guests ?? null,
            items: mergeItems(existing.items, t.items),
          }
        : t,
    );
  }
  const trips = [...byId.values()];
  const activeTripId = trips.some((t) => t.id === local.activeTripId) ? local.activeTripId : trips[0].id;
  return { activeTripId, trips };
}
