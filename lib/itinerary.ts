// Build My Somerset Itinerary: a rule-based planner over real listings. It is
// deliberately not a language model: every suggestion is a real published
// listing, chosen by the rules below, and the whole result can be swapped,
// rearranged, saved, shared and exported. Pure functions, no database access,
// so the same code runs on the server (generate) and in the browser (edit).

export type PlaceKind = "stay" | "do" | "food" | "event";

export type PoolItem = {
  id: string;
  kind: PlaceKind;
  title: string;
  slug: string;
  imageUrl: string | null;
  town: string | null;
  lat: number;
  lng: number;
  priceFrom: number | null;
  priceUnit: string | null;
  free: boolean;
  /** Accessibility and dog-friendly keys (lib/accessibility.ts). */
  access: string[];
  level: "GROWTH" | "PARTNER" | "PREMIUM" | null;
  startDate: string | null;
  endDate: string | null;
  /** Lower-cased title, summary and the start of the description, for interest matching. */
  text: string;
  bookingUrl: string | null;
};

export const INTERESTS: { key: string; label: string; words: string[] }[] = [
  { key: "coast", label: "Coast and beaches", words: ["coast", "beach", "sea", "pier", "cliff", "bay", "harbour", "seaside"] },
  { key: "food", label: "Food and drink", words: ["cider", "cheese", "farm shop", "brewery", "vineyard", "gin", "tea room", "tasting", "local produce"] },
  { key: "family", label: "Family adventures", words: ["family", "children", "kids", "play", "zoo", "farm park", "adventure", "fun"] },
  { key: "hidden", label: "Hidden Somerset", words: ["hidden", "secret", "quiet", "village", "gem", "tucked", "peaceful"] },
  { key: "heritage", label: "Heritage and history", words: ["castle", "abbey", "history", "heritage", "museum", "roman", "legend", "cathedral", "medieval", "historic"] },
  { key: "walking", label: "Walking and outdoors", words: ["walk", "trail", "hill", "moor", "gorge", "nature", "reserve", "cycle", "woodland", "hike"] },
];

export type Pace = "relaxed" | "balanced" | "packed";

export type Prefs = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD, inclusive
  adults: number;
  children: number;
  /** Total budget for the whole party, excluding travel. Null = no limit. */
  budget: number | null;
  dog: boolean;
  access: string[];
  interests: string[];
  pace: Pace;
  area: string | null;
};

export type Slot = "stay" | "morning" | "lunch" | "afternoon" | "evening";

export type PlanItem = {
  uid: string;
  id: string;
  kind: PlaceKind;
  slot: Slot;
  title: string;
  slug: string;
  imageUrl: string | null;
  town: string | null;
  lat: number;
  lng: number;
  priceText: string | null;
  note: string | null;
  access: string[];
  bookingUrl: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type PlanDay = { date: string; items: PlanItem[] };

export type Itinerary = {
  prefs: Prefs;
  stay: PlanItem | null;
  days: PlanDay[];
  notes: string[];
  /** Ids the visitor swapped out, so they are not offered again. */
  skipped: string[];
};

export const MAX_DAYS = 14;

const SLOTS: Record<Pace, { slot: Slot; kind: PlaceKind }[]> = {
  relaxed: [
    { slot: "morning", kind: "do" },
    { slot: "lunch", kind: "food" },
    { slot: "afternoon", kind: "do" },
  ],
  balanced: [
    { slot: "morning", kind: "do" },
    { slot: "lunch", kind: "food" },
    { slot: "afternoon", kind: "do" },
    { slot: "evening", kind: "food" },
  ],
  packed: [
    { slot: "morning", kind: "do" },
    { slot: "morning", kind: "do" },
    { slot: "lunch", kind: "food" },
    { slot: "afternoon", kind: "do" },
    { slot: "afternoon", kind: "do" },
    { slot: "evening", kind: "food" },
  ],
};

export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(`${start}T12:00:00Z`);
  const e = new Date(`${end}T12:00:00Z`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return [start];
  for (let d = s; d <= e && out.length < MAX_DAYS; d = new Date(d.getTime() + 86400000)) out.push(d.toISOString().slice(0, 10));
  return out;
}

let counter = 0;
function uid(): string {
  counter += 1;
  return `i${Date.now().toString(36)}${counter}${Math.random().toString(36).slice(2, 5)}`;
}

function partySize(p: Prefs): number {
  return Math.max(1, p.adults + p.children);
}

function costPerDay(item: PoolItem, p: Prefs): number | null {
  if (item.free) return 0;
  if (item.priceFrom == null) return null;
  return item.priceUnit === "per person" || item.priceUnit == null ? item.priceFrom * partySize(p) : item.priceFrom;
}

function priceText(item: PoolItem): string | null {
  if (item.free) return "Free";
  if (item.priceFrom == null) return null;
  const unit = item.priceUnit ? ` ${item.priceUnit}` : "";
  const n = item.priceFrom % 1 === 0 ? String(item.priceFrom) : item.priceFrom.toFixed(2);
  return `From £${n}${unit}`;
}

function toPlan(item: PoolItem, slot: Slot, p: Prefs): PlanItem {
  const noteBits: string[] = [];
  if (p.dog && item.kind !== "stay" && !item.access.includes("dogFriendly")) noteBits.push("Check the dog policy with them");
  return {
    uid: uid(),
    id: item.id,
    kind: item.kind,
    slot,
    title: item.title,
    slug: item.slug,
    imageUrl: item.imageUrl,
    town: item.town,
    lat: item.lat,
    lng: item.lng,
    priceText: priceText(item),
    note: noteBits.length ? noteBits.join(". ") : null,
    access: item.access,
    bookingUrl: item.bookingUrl,
    startDate: item.startDate,
    endDate: item.endDate,
  };
}

const NEEDED_ACCESS = (p: Prefs) => p.access.filter((a) => a !== "dogFriendly");

// Things-to-do contains shops, holiday parks and accommodation listed by
// attraction owners; they are not a day out.
const NOT_A_DAY_OUT = /(caravan|campsite|camping|holiday park|self[- ]?catering|b&b|bed and breakfast|shop|store|hire|cottages?|huts?|glamping|cabins?|yurts?|pods?|apartments?|hotel|suites?|holiday (?:home|let|lodge)s?)/i;

function allowed(item: PoolItem, p: Prefs, relax: { access: boolean; price: boolean }): boolean {
  if (item.kind === "do" && NOT_A_DAY_OUT.test(item.title)) return false;
  if (!relax.access && !NEEDED_ACCESS(p).every((a) => item.access.includes(a))) return false;
  if (p.dog && item.kind === "stay" && !item.access.includes("dogFriendly")) return false;
  if (!relax.price && p.budget != null && item.kind !== "event") {
    // With a budget set, only listings that state a price (or are free) are used.
    if (item.priceFrom == null && !item.free) return false;
  }
  return true;
}

function score(item: PoolItem, p: Prefs, from: { lat: number; lng: number } | null): number {
  let s = 10;
  s += item.level === "PREMIUM" ? 6 : item.level === "PARTNER" ? 3 : item.level === "GROWTH" ? 1 : 0;
  if (item.imageUrl) s += 3;
  let matches = 0;
  for (const key of p.interests) {
    const words = INTERESTS.find((i) => i.key === key)?.words ?? [];
    if (words.some((w) => item.text.includes(w))) matches += 1;
  }
  s += Math.min(3, matches) * 8;
  if (p.area && item.town && item.town.toLowerCase() === p.area.toLowerCase()) s += 15;
  if (p.dog && item.access.includes("dogFriendly")) s += 6;
  if (from) s -= miles(from, item) * 1.5;
  return s;
}

function bestOf(
  pool: PoolItem[],
  kind: PlaceKind,
  p: Prefs,
  used: Set<string>,
  from: { lat: number; lng: number } | null,
  relax: { access: boolean; price: boolean },
  maxMiles: number,
): PoolItem | null {
  let best: PoolItem | null = null;
  let bestScore = -Infinity;
  for (const item of pool) {
    if (item.kind !== kind || used.has(item.id)) continue;
    if (!allowed(item, p, relax)) continue;
    if (from && miles(from, item) > maxMiles) continue;
    const s = score(item, p, from);
    if (s > bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}

function pick(
  pool: PoolItem[],
  kind: PlaceKind,
  p: Prefs,
  used: Set<string>,
  from: { lat: number; lng: number } | null,
  maxMiles: number,
  notes: Set<string>,
): PoolItem | null {
  const strict = bestOf(pool, kind, p, used, from, { access: false, price: false }, maxMiles);
  if (strict) return strict;
  // Nothing fits every requirement nearby: widen, and say so.
  const wider = bestOf(pool, kind, p, used, from, { access: false, price: false }, maxMiles * 2.5);
  if (wider) return wider;
  if (p.budget != null) {
    const noPrice = bestOf(pool, kind, p, used, from, { access: false, price: true }, maxMiles * 2.5);
    if (noPrice) {
      notes.add("Some suggestions don't list a price, so they could be outside your budget. Check before you go.");
      return noPrice;
    }
  }
  if (NEEDED_ACCESS(p).length > 0) {
    const loose = bestOf(pool, kind, p, used, from, { access: true, price: true }, maxMiles * 2.5);
    if (loose) {
      notes.add("We couldn't find enough places confirmed for every access feature you chose. Items marked with a note should be checked with the venue.");
      return loose;
    }
  }
  return null;
}

export function generateItinerary(
  prefs: Prefs,
  pool: PoolItem[],
  // Used to add a day to an existing plan: keep the same stay and never repeat what is already in it.
  extend?: { anchor: { lat: number; lng: number } | null; exclude: Set<string> },
): Itinerary {
  const days = daysBetween(prefs.startDate, prefs.endDate);
  const nights = Math.max(1, days.length - 1);
  const notes = new Set<string>();
  const used = new Set<string>(extend?.exclude ?? []);

  // Budget split: half for where you sleep, half for days out and food.
  const stayBudget = prefs.budget != null ? (prefs.budget * 0.5) / nights : null;
  const dayBudget = prefs.budget != null ? (prefs.budget * 0.5) / days.length : null;

  // 1. A place to stay.
  const stayPool =
    stayBudget != null
      ? pool.filter((i) => i.kind !== "stay" || (i.priceFrom != null && i.priceFrom <= stayBudget) || false)
      : pool;
  let stayItem = extend ? null : pick(stayPool, "stay", prefs, used, null, 1000, notes);
  if (!extend && !stayItem && stayBudget != null) {
    stayItem = pick(pool, "stay", prefs, used, null, 1000, notes);
    if (stayItem) notes.add("Nothing we have priced fits that nightly budget, so this is the closest stay we could find.");
  }
  if (stayItem) used.add(stayItem.id);
  const anchor = extend ? extend.anchor : stayItem ? { lat: stayItem.lat, lng: stayItem.lng } : null;
  if (extend) {
    /* the stay is already chosen */
  } else if (!stayItem) notes.add("We couldn't match a place to stay to your needs, so this plan has days out only.");
  else if (prefs.dog && !stayItem.access.includes("dogFriendly")) notes.add("Confirm dogs are welcome before booking the stay.");

  // 2. Each day.
  const slots = SLOTS[prefs.pace];
  const planDays: PlanDay[] = days.map((date) => ({ date, items: [] }));
  for (const day of planDays) {
    let last = anchor;
    let spent = 0;

    // An event running that day takes the afternoon, if one fits.
    const event = pool
      .filter(
        (i) =>
          i.kind === "event" &&
          !used.has(i.id) &&
          i.startDate &&
          i.startDate <= day.date &&
          (i.endDate ?? i.startDate) >= day.date &&
          allowed(i, prefs, { access: false, price: false }) &&
          (!anchor || miles(anchor, i) <= 25),
      )
      .sort((a, b) => score(b, prefs, anchor) - score(a, prefs, anchor))[0];

    let eventPlaced = false;
    for (const s of slots) {
      if (s.slot === "afternoon" && event && !eventPlaced) {
        const item = toPlan(event, "afternoon", prefs);
        day.items.push(item);
        used.add(event.id);
        last = { lat: event.lat, lng: event.lng };
        eventPlaced = true;
        continue;
      }
      const maxMiles = s.kind === "food" ? 6 : 14;
      let candidate = pick(pool, s.kind, prefs, used, last, maxMiles, notes);
      if (candidate && dayBudget != null) {
        const c = costPerDay(candidate, prefs);
        if (c != null && spent + c > dayBudget * 1.25) {
          // Too dear for the day: try a cheaper one, otherwise leave the slot.
          const cheap = pool
            .filter((i) => i.kind === s.kind && !used.has(i.id) && allowed(i, prefs, { access: false, price: false }))
            .filter((i) => {
              const cc = costPerDay(i, prefs);
              return cc != null && spent + cc <= dayBudget * 1.25 && (!last || miles(last, i) <= maxMiles * 2.5);
            })
            .sort((a, b) => score(b, prefs, last) - score(a, prefs, last))[0];
          candidate = cheap ?? null;
        }
      }
      if (!candidate) continue;
      const c = costPerDay(candidate, prefs);
      if (c != null) spent += c;
      used.add(candidate.id);
      day.items.push(toPlan(candidate, s.slot, prefs));
      last = { lat: candidate.lat, lng: candidate.lng };
    }
  }

  if (prefs.budget != null) notes.add("Prices are 'from' prices as listed. Check each before you book.");
  return {
    prefs,
    stay: stayItem ? toPlan(stayItem, "stay", prefs) : null,
    days: planDays,
    notes: [...notes],
    skipped: [],
  };
}

/** Replaces one item with the next best real alternative of the same kind. */
export function swapItem(it: Itinerary, pool: PoolItem[], itemUid: string): Itinerary {
  const prefs = it.prefs;
  const used = new Set<string>([...(it.stay ? [it.stay.id] : []), ...it.days.flatMap((d) => d.items.map((i) => i.id)), ...it.skipped]);
  const notes = new Set<string>(it.notes);

  if (it.stay && it.stay.uid === itemUid) {
    const next = pick(pool, "stay", prefs, used, null, 1000, notes);
    if (!next) return { ...it, notes: [...notes, "No other stay matches your needs."] };
    return { ...it, stay: toPlan(next, "stay", prefs), skipped: [...it.skipped, it.stay.id], notes: [...notes] };
  }

  const days = it.days.map((d) => ({ ...d, items: [...d.items] }));
  for (const d of days) {
    const idx = d.items.findIndex((i) => i.uid === itemUid);
    if (idx === -1) continue;
    const current = d.items[idx];
    const near = idx > 0 ? d.items[idx - 1] : it.stay;
    const from = near ? { lat: near.lat, lng: near.lng } : { lat: current.lat, lng: current.lng };
    const kind: PlaceKind = current.kind === "event" ? "do" : current.kind;
    const next = pick(pool, kind, prefs, used, from, kind === "food" ? 6 : 14, notes);
    if (!next) return { ...it, notes: [...notes, "No other suggestion fits there."] };
    d.items[idx] = toPlan(next, current.slot, prefs);
    return { ...it, days, skipped: [...it.skipped, current.id], notes: [...notes] };
  }
  return it;
}

export function itineraryTitle(it: Itinerary): string {
  const days = it.days.length;
  const where = it.stay?.town ?? it.prefs.area ?? "Somerset";
  return `${days} day${days === 1 ? "" : "s"} in ${where}`;
}

export function defaultPrefs(): Prefs {
  const start = new Date(Date.now() + 14 * 86400000);
  const end = new Date(start.getTime() + 2 * 86400000);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    adults: 2,
    children: 0,
    budget: null,
    dog: false,
    access: [],
    interests: [],
    pace: "balanced",
    area: null,
  };
}

/** Adds one more day after the last, with the same stay and no repeats. */
export function addDay(it: Itinerary, pool: PoolItem[]): Itinerary {
  if (it.days.length >= MAX_DAYS) return it;
  const last = it.days[it.days.length - 1]?.date ?? it.prefs.endDate;
  const next = new Date(new Date(`${last}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10);
  const exclude = new Set<string>([...(it.stay ? [it.stay.id] : []), ...it.days.flatMap((d) => d.items.map((i) => i.id)), ...it.skipped]);
  const anchor = it.stay ? { lat: it.stay.lat, lng: it.stay.lng } : null;
  // The budget is split across all days, so an extra day gets the same share.
  const budget = it.prefs.budget != null ? ((it.prefs.budget * 0.5) / (it.days.length + 1)) * 2 : null;
  const extra = generateItinerary({ ...it.prefs, budget, startDate: next, endDate: next }, pool, { anchor, exclude });
  return {
    ...it,
    prefs: { ...it.prefs, endDate: next },
    days: [...it.days, ...extra.days.slice(0, 1)],
    notes: Array.from(new Set([...it.notes, ...extra.notes])),
  };
}

/** The best few real alternatives for one item, so the visitor can choose. */
export function alternativesFor(it: Itinerary, pool: PoolItem[], itemUid: string, limit = 5): PlanItem[] {
  const prefs = it.prefs;
  const used = new Set<string>([...(it.stay ? [it.stay.id] : []), ...it.days.flatMap((d) => d.items.map((i) => i.id))]);

  let kind: PlaceKind | null = null;
  let slot: Slot = "afternoon";
  let from: { lat: number; lng: number } | null = null;
  if (it.stay && it.stay.uid === itemUid) {
    kind = "stay";
    slot = "stay";
  } else {
    for (const d of it.days) {
      const idx = d.items.findIndex((i) => i.uid === itemUid);
      if (idx === -1) continue;
      const cur = d.items[idx];
      kind = cur.kind === "event" ? "do" : cur.kind;
      slot = cur.slot;
      const near = idx > 0 ? d.items[idx - 1] : it.stay;
      from = near ? { lat: near.lat, lng: near.lng } : { lat: cur.lat, lng: cur.lng };
    }
  }
  if (!kind) return [];

  const radius = kind === "stay" ? 1000 : kind === "food" ? 8 : 18;
  return pool
    .filter((i) => i.kind === kind && !used.has(i.id) && allowed(i, prefs, { access: false, price: false }) && (!from || miles(from, i) <= radius))
    .map((i) => ({ i, s: score(i, prefs, from) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ i }) => toPlan(i, slot, prefs));
}
