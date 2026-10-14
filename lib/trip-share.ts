import { addTripItem, getTripItems, type TripItem } from "./trip-storage";

export type TripDetail = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  town: string | null;
  lat: number | null;
  lng: number | null;
  startDate: string | null;
  endDate: string | null;
  admission: string | null;
  address: string | null;
  bookingUrl: string | null;
  bookingLabel: string | null;
  isStay: boolean;
};

export function buildShareUrl(items: TripItem[], origin: string): string {
  return `${origin}/my-trip?add=${items.map((item) => item.id).join(",")}`;
}

// Real details (coordinates, dates, address...) for the places in a trip —
// the trip itself only stores id/title/slug so it stays tiny on the device.
export async function fetchTripDetails(ids: string[]): Promise<Record<string, TripDetail>> {
  if (ids.length === 0) return {};
  try {
    const res = await fetch(`/api/trip-lookup?ids=${ids.join(",")}`);
    if (!res.ok) return {};
    const data: { items: TripDetail[] } = await res.json();
    return Object.fromEntries(data.items.map((i) => [i.id, i]));
  } catch {
    return {};
  }
}

// Merges ids from a shared trip link into this device's active trip. Only
// looks up ids not already saved locally, and fails silently on network
// error — a broken/offline shared link should never crash the page, it
// should just leave the trip as it already was.
export async function mergeSharedTripLink(ids: string[]): Promise<TripItem[]> {
  const current = getTripItems();
  const currentIds = new Set(current.map((item) => item.id));
  const missingIds = ids.filter((id) => id && !currentIds.has(id));
  if (missingIds.length === 0) return current;

  const details = await fetchTripDetails(missingIds);
  let next = current;
  for (const id of missingIds) {
    const page = details[id];
    if (page) next = addTripItem({ id: page.id, title: page.title, slug: page.slug, heroImageUrl: page.heroImageUrl });
  }
  return next;
}
