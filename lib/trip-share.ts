import { addTripItem, getTripItems, type TripItem } from "./trip-storage";

export function buildShareUrl(items: TripItem[], origin: string): string {
  return `${origin}/my-trip?add=${items.map((item) => item.id).join(",")}`;
}

// Merges ids from a shared trip link into this device's local trip. Only
// looks up ids not already saved locally, and fails silently on network
// error — a broken/offline shared link should never crash the page, it
// should just leave the trip as it already was.
export async function mergeSharedTripLink(ids: string[]): Promise<TripItem[]> {
  const current = getTripItems();
  const currentIds = new Set(current.map((item) => item.id));
  const missingIds = ids.filter((id) => id && !currentIds.has(id));
  if (missingIds.length === 0) return current;

  try {
    const res = await fetch(`/api/trip-lookup?ids=${missingIds.join(",")}`);
    if (!res.ok) return current;
    const data: { items: { id: string; title: string; slug: string; heroImageUrl: string | null }[] } = await res.json();
    let next = current;
    for (const page of data.items) {
      next = addTripItem(page);
    }
    return next;
  } catch {
    return current;
  }
}
