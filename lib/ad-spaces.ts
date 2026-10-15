// Bookable advertising spaces: a placement on a Visit Somerset page, sold by
// the week with a handful of slots. Prices and slot counts are set here (the
// figures from the mockup pack) until the team wants to manage them in the
// Content Hub. Requests are held for the team to confirm and invoice; there
// is no card payment on this site yet.

export type Placement = { key: string; label: string; weekPencePrice: number; slots: number };

export const PLACEMENTS: Placement[] = [
  { key: "food-drink", label: "Food & Drink", weekPencePrice: 18000, slots: 3 },
  { key: "places-to-stay", label: "Places to Stay", weekPencePrice: 32000, slots: 3 },
  { key: "home", label: "Home page", weekPencePrice: 42000, slots: 3 },
  { key: "festivals-events", label: "Festivals & Events", weekPencePrice: 24000, slots: 3 },
  { key: "interactive-map", label: "Interactive Map", weekPencePrice: 14000, slots: 3 },
  { key: "buy-somerset", label: "Buy Somerset", weekPencePrice: 12000, slots: 3 },
];

export const MIN_WEEKS_FOR_DISCOUNT = 4;
export const MULTI_WEEK_DISCOUNT = 0.15;
export const VAT_RATE = 0.2;
export const WEEKS_AHEAD = 8;

export function placementByKey(key: string): Placement | undefined {
  return PLACEMENTS.find((p) => p.key === key);
}

export function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The next WEEKS_AHEAD Mondays, starting with the first Monday that is at least 7 days away. */
export function bookableWeeks(now = new Date()): string[] {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const toMonday = (8 - d.getDay()) % 7; // 0 when already Monday
  d.setDate(d.getDate() + toMonday);
  return Array.from({ length: WEEKS_AHEAD }, (_, i) => {
    const w = new Date(d);
    w.setDate(d.getDate() + i * 7);
    return toIso(w);
  });
}

export function formatPence(p: number): string {
  return `£${(p / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function totals(placementKeys: string[], weeks: string[]) {
  const lines = placementKeys
    .map((k) => placementByKey(k))
    .filter((p): p is Placement => !!p)
    .map((p) => ({ placement: p, weeks: weeks.length, amount: p.weekPencePrice * weeks.length }));
  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const discountApplies = weeks.length >= MIN_WEEKS_FOR_DISCOUNT;
  const discount = discountApplies ? Math.round(subtotal * MULTI_WEEK_DISCOUNT) : 0;
  const net = subtotal - discount;
  const vat = Math.round(net * VAT_RATE);
  return { lines, subtotal, discount, net, vat, total: net + vat };
}
