import { getExplorerItems, queryExplorer, type ExplorerResult } from "@/lib/data/listing-explorer";

// Book Experiences (Phase 12): the real things-to-do listings that carry
// their own online booking link. Nothing here pretends to be live
// availability — each card hands the visitor to the operator's own booking
// page, so Visit Somerset takes no commission by construction.

export const EXPERIENCE_ROOT = "things-to-do";

const KINDS = [
  { label: "Cider & cheese tours", q: "cider" },
  { label: "Caves & the outdoors", q: "cave" },
  { label: "Heritage & houses", q: "heritage" },
  { label: "On the water", q: "boat" },
  { label: "Family days out", q: "family" },
  { label: "Dog friendly", q: "dog" },
];

export type ExperiencesHub = {
  result: ExplorerResult;
  stats: { count: number; avgPrice: number | null; priced: number };
  kinds: { label: string; q: string; count: number }[];
  towns: { name: string; count: number }[];
};

export async function getExperiencesHub(params: {
  q?: string;
  town?: string;
  page?: number;
  sort?: string;
}): Promise<ExperiencesHub> {
  const [all, result] = await Promise.all([
    getExplorerItems(EXPERIENCE_ROOT),
    queryExplorer("things", EXPERIENCE_ROOT, { ...params, bookable: true }),
  ]);
  const bookable = all.filter((i) => i.hasBooking && !i.startDate);
  const priced = bookable.filter((i) => i.priceFrom !== null);
  const avg = priced.length ? priced.reduce((s, i) => s + (i.priceFrom ?? 0), 0) / priced.length : null;

  const kinds = KINDS.map((k) => ({
    ...k,
    count: bookable.filter((i) => `${i.title} ${i.subtitle ?? ""} ${i.summary ?? ""} ${i.type}`.toLowerCase().includes(k.q)).length,
  }));

  const townCounts = new Map<string, number>();
  for (const i of bookable) if (i.town) townCounts.set(i.town, (townCounts.get(i.town) ?? 0) + 1);
  const towns = [...townCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { result, stats: { count: bookable.length, avgPrice: avg, priced: priced.length }, kinds, towns };
}
