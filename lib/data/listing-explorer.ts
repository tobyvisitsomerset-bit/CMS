import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { priorityOf, toLevel } from "@/lib/membership";

// Real-data listing engine (Phase 12) behind the accommodation, things-to-do,
// food & drink and festivals & events landing pages. Everything here is
// derived from the real Kentico-imported Page rows — no mock Listing table,
// no invented ratings/prices/availability. A business's `ItemAdmission` field
// is member-entered pricing text ("From £15.50 per night"); when a £ amount
// can be read out of it we show it as "from £X", otherwise we show nothing.

export type ExplorerKind = "accommodation" | "things" | "food" | "events";

export type ExplorerItem = {
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  heroImageUrl: string | null;
  summary: string | null;
  town: string | null;
  tier: "GROWTH" | "PARTNER" | "PREMIUM" | null;
  type: string; // section label, e.g. "Hotels"
  typeSlug: string; // second slug segment under the root
  priceFrom: number | null;
  priceUnit: string | null;
  admission: string | null;
  grading: string | null;
  startDate: string | null;
  endDate: string | null;
  lat: number | null;
  lng: number | null;
  hasBooking: boolean;
  bookingUrl: string | null;
  bookingLabel: string | null;
};


export function parsePrice(admission: string | null): { from: number | null; unit: string | null } {
  if (!admission) return { from: null, unit: null };
  const amounts = [...admission.matchAll(/£\s?(\d{1,4}(?:\.\d{1,2})?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => n >= 1 && n <= 5000);
  if (amounts.length === 0) return { from: null, unit: null };
  const lower = admission.toLowerCase();
  const unit = /per night|a night|\/night|pppn|per room/.test(lower)
    ? "per night"
    : /per week|a week|\/week/.test(lower)
      ? "per week"
      : /per person|pp\b/.test(lower)
        ? "per person"
        : null;
  return { from: Math.min(...amounts), unit };
}

function summarise(body: string | null): string | null {
  const text = decodeKenticoText(body);
  if (!text) return null;
  return text.length > 190 ? `${text.slice(0, 187).trimEnd()}…` : text;
}

async function loadExplorerItems(rootSlug: string): Promise<ExplorerItem[]> {
  // Pages that sit anywhere under the landing page in the content tree, found
  // by parent links rather than by address, so a page filed under Hotels is
  // listed on Hotels even if its address was made from a different path.
  const underRoot = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH RECURSIVE t AS (
      SELECT id FROM "Page" WHERE slug = ${rootSlug}
      UNION ALL
      SELECT p.id FROM "Page" p JOIN t ON p."parentId" = t.id
    )
    SELECT id FROM t`);
  const underRootIds = underRoot.map((r) => r.id);

  const [sections, rows] = await Promise.all([
    prisma.page.findMany({
      where: { parent: { slug: rootSlug }, status: "PUBLISHED" },
      select: { slug: true, title: true },
    }),
    prisma.page.findMany({
      where: {
        status: "PUBLISHED",
        linkedPageId: null,
        OR: [{ slug: { startsWith: `${rootSlug}/` } }, { id: { in: underRootIds } }],
        customFields: { contains: "sz.touristitem" },
      },
      select: {
        id: true,
        title: true,
        subtitle: true,
        slug: true,
        heroImageUrl: true,
        bodyContent: true,
        customFields: true,
        membershipTier: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const sectionLabel = new Map(sections.map((s) => [s.slug, s.title]));

  // Linked pages (Kentico "link existing page"): a link under this landing
  // page is listed as the page it points to, in the place where it was
  // linked, and never twice.
  const linkRows = await prisma.page.findMany({
    where: {
      status: "PUBLISHED",
      linkedPageId: { not: null },
      OR: [{ slug: { startsWith: `${rootSlug}/` } }, { id: { in: underRootIds } }],
    },
    select: { slug: true, linkedPageId: true },
  });
  const have = new Set(rows.map((r) => r.id));
  const linkPlace = new Map<string, string>();
  for (const l of linkRows) if (l.linkedPageId && !linkPlace.has(l.linkedPageId)) linkPlace.set(l.linkedPageId, l.slug);
  const missing = [...linkPlace.keys()].filter((id) => !have.has(id));
  const targets = missing.length
    ? await prisma.page.findMany({
        where: { id: { in: missing }, status: "PUBLISHED", linkedPageId: null, customFields: { contains: "sz.touristitem" } },
        select: {
          id: true,
          title: true,
          subtitle: true,
          slug: true,
          heroImageUrl: true,
          bodyContent: true,
          customFields: true,
          membershipTier: true,
          sortOrder: true,
        },
      })
    : [];
  rows.push(...targets);


  const seenEvents = new Set<string>();
  const unique = rows.filter((r) => {
    const f = parseCustomFields(r.customFields);
    if (!f.ItemStartDate) return true;
    const key = `${r.title.trim().toLowerCase()}|${f.ItemStartDate.slice(0, 10)}`;
    if (seenEvents.has(key)) return false;
    seenEvents.add(key);
    return true;
  });

  return unique.map((r): ExplorerItem => {
    const fields = parseCustomFields(r.customFields);
    const info = getBusinessInfo(fields);
    // Where it sits in this section: its own place, or the place it was linked.
    const place = r.slug.startsWith(`${rootSlug}/`) ? r.slug : (linkPlace.get(r.id) ?? r.slug);
    const rest = place.startsWith(`${rootSlug}/`) ? place.slice(rootSlug.length + 1).split("/") : [place];
    const typeSlug = rest.length > 1 ? rest[0] : "";
    const price = parsePrice(info?.admission ?? null);
    const lat = info?.mapLat ?? null;
    const lng = info?.mapLng ?? null;
    const plausible = lat !== null && lng !== null && lat > 49 && lat < 56 && lng > -8 && lng < 3;
    return {
      id: r.id,
      title: r.title,
      subtitle: decodeKenticoText(r.subtitle),
      slug: r.slug,
      heroImageUrl: r.heroImageUrl,
      summary: summarise(r.bodyContent),
      town: info?.town ?? null,
      tier: toLevel(r.membershipTier),
      type: sectionLabel.get(`${rootSlug}/${typeSlug}`) ?? "",
      typeSlug,
      priceFrom: price.from,
      priceUnit: price.unit,
      admission: info?.admission ? info.admission.slice(0, 120) : null,
      grading: fields.ItemGrading ? (decodeKenticoText(fields.ItemGrading) ?? "").split(" · ")[0] || null : null,
      startDate: info?.startDate ?? null,
      endDate: info?.endDate ?? null,
      lat: plausible ? lat : null,
      lng: plausible ? lng : null,
      hasBooking: !!info?.bookingUrl,
      bookingUrl: info?.bookingUrl ?? null,
      bookingLabel: info?.bookingUrl ? info.bookingLabel : null,
    };
  });
}

// Cached across requests (5 min) — hundreds of rows, parsed once.
export const getExplorerItems = unstable_cache(loadExplorerItems, ["explorer-items"], { revalidate: 300, tags: ["listings"] });

export type ExplorerParams = {
  q?: string;
  type?: string;
  town?: string;
  sort?: string;
  page?: number;
  when?: string; // events: week | weekend | month:YYYY-MM
  day?: string; // events: YYYY-MM-DD
  free?: boolean;
  graded?: boolean;
  bookable?: boolean;
  featured?: boolean;
};

export type ExplorerResult = {
  kind: ExplorerKind;
  total: number; // before filters
  matched: number;
  items: ExplorerItem[]; // current page
  mapPins: { id: string; title: string; slug: string; lat: number; lng: number; priceFrom: number | null }[];
  featured: ExplorerItem | null;
  page: number;
  pageSize: number;
  pageCount: number;
  types: { slug: string; label: string; count: number }[];
  towns: { name: string; count: number }[];
  months: { key: string; label: string; count: number }[];
  eventDays: string[]; // YYYY-MM-DD with at least one matching event (ignoring the day filter)
  next30: number;
  counts: { graded: number; bookable: number; featured: number; free: number };
};

const PAGE_SIZE = 12;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isFree(item: ExplorerItem) {
  return !!item.admission && /\bfree\b/i.test(item.admission) && !/£/.test(item.admission);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function eventMatchesWhen(item: ExplorerItem, when: string, now = new Date()): boolean {
  if (!item.startDate) return false;
  const start = new Date(item.startDate);
  const end = item.endDate ? new Date(item.endDate) : start;
  const today = startOfDay(now);
  if (when === "week") {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return end >= today && start < weekEnd;
  }
  if (when === "weekend") {
    const day = today.getDay(); // 0 Sun
    const sat = new Date(today);
    if (day === 0) sat.setDate(today.getDate() - 1);
    else sat.setDate(today.getDate() + (6 - day));
    const mon = new Date(sat);
    mon.setDate(sat.getDate() + 2);
    return end >= sat && start < mon;
  }
  if (when.startsWith("month:")) {
    const key = when.slice(6);
    const m0 = new Date(`${key}-01T00:00:00`);
    const m1 = new Date(m0.getFullYear(), m0.getMonth() + 1, 1);
    return end >= m0 && start < m1;
  }
  return true;
}

export function eventOnDay(item: ExplorerItem, day: string): boolean {
  if (!item.startDate) return false;
  const start = item.startDate.slice(0, 10);
  const end = (item.endDate ?? item.startDate).slice(0, 10);
  return start <= day && day <= end;
}

export async function queryExplorer(kind: ExplorerKind, rootSlug: string, params: ExplorerParams): Promise<ExplorerResult> {
  const all = await getExplorerItems(rootSlug);
  const now = new Date();
  const today = startOfDay(now);

  // Events: only ones that haven't finished yet.
  const base = kind === "events" ? all.filter((i) => i.startDate && new Date(i.endDate ?? i.startDate) >= today) : all;

  const typeCounts = new Map<string, { label: string; count: number }>();
  const townCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  for (const i of base) {
    if (i.typeSlug) {
      const e = typeCounts.get(i.typeSlug) ?? { label: i.type || i.typeSlug, count: 0 };
      e.count++;
      typeCounts.set(i.typeSlug, e);
    }
    if (i.town) townCounts.set(i.town, (townCounts.get(i.town) ?? 0) + 1);
    if (kind === "events" && i.startDate) {
      // An exhibition that began in May but runs to October counts for the
      // month it is still on, not the month it opened.
      const effective = new Date(i.startDate) < today ? today : new Date(i.startDate);
      const k = `${effective.getFullYear()}-${String(effective.getMonth() + 1).padStart(2, "0")}`;
      monthCounts.set(k, (monthCounts.get(k) ?? 0) + 1);
    }
  }

  const q = params.q?.trim().toLowerCase() ?? "";
  const passes = (i: ExplorerItem, ignoreDay = false) => {
    if (params.type && i.typeSlug !== params.type) return false;
    if (params.town && i.town !== params.town) return false;
    if (params.graded && !i.grading) return false;
    if (params.bookable && !i.hasBooking) return false;
    if (params.featured && i.tier !== "PREMIUM") return false;
    if (params.free && !isFree(i)) return false;
    if (params.when && params.when !== "all" && !eventMatchesWhen(i, params.when, now)) return false;
    if (!ignoreDay && params.day && !eventOnDay(i, params.day)) return false;
    if (q) {
      const hay = `${i.title} ${i.subtitle ?? ""} ${i.town ?? ""} ${i.type} ${i.summary ?? ""}`.toLowerCase();
      if (!q.split(/\s+/).every((word) => hay.includes(word))) return false;
    }
    return true;
  };
  let filtered = base.filter((i) => passes(i));

  const daySet = new Set<string>();
  let next30 = 0;
  if (kind === "events") {
    const horizon = new Date(today);
    horizon.setDate(horizon.getDate() + 30);
    for (const i of base) {
      if (i.startDate && new Date(i.startDate) < horizon) next30++;
      if (!passes(i, true) || !i.startDate) continue;
      const startRaw = new Date(i.startDate.slice(0, 10) + "T12:00:00");
      const start = startRaw < today ? new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12) : startRaw;
      const end = new Date((i.endDate ?? i.startDate).slice(0, 10) + "T12:00:00");
      for (let d = new Date(start), n = 0; d <= end && n < 62; d.setDate(d.getDate() + 1), n++) {
        daySet.add(d.toISOString().slice(0, 10));
      }
    }
  }

  const sort = params.sort ?? (kind === "events" ? "date" : "recommended");
  filtered = [...filtered];
  if (sort === "name") filtered.sort((a, b) => a.title.localeCompare(b.title));
  else if (sort === "price") filtered.sort((a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity));
  else if (sort === "date" || kind === "events") {
    const eff = (i: ExplorerItem) => Math.max(new Date(i.startDate ?? 0).getTime(), today.getTime());
    filtered.sort(
      (a, b) =>
        eff(a) - eff(b) ||
        new Date(a.endDate ?? a.startDate ?? 0).getTime() - new Date(b.endDate ?? b.startDate ?? 0).getTime(),
    );
  } else {
    // recommended: higher membership tier first (the pack's featured-member
    // rule), otherwise the editorial order already in the tree.
    filtered.sort((a, b) => priorityOf(b.tier) - priorityOf(a.tier));
  }

  const pageSize = kind === "events" ? 20 : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, params.page ?? 1), pageCount);
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // The pack's "Featured member" placement: the top-ranked Premium
  // listing is pinned above the list on the first page of the recommended
  // sort, and removed from the normal run so it never shows twice.
  let featured: ExplorerItem | null = null;
  let items = pageItems;
  if (kind !== "events" && page === 1 && sort === "recommended") {
    const top = pageItems.find((i) => i.tier === "PREMIUM");
    if (top) {
      featured = top;
      items = pageItems.filter((i) => i.id !== top.id);
    }
  }

  const mapPins = filtered
    .filter((i): i is ExplorerItem & { lat: number; lng: number } => i.lat !== null && i.lng !== null)
    .slice(0, 400)
    .map((i) => ({ id: i.id, title: i.title, slug: i.slug, lat: i.lat, lng: i.lng, priceFrom: i.priceFrom }));

  const monthLabel = (k: string) => new Date(`${k}-01T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return {
    kind,
    total: base.length,
    matched: filtered.length,
    items,
    mapPins,
    featured,
    page,
    pageSize,
    pageCount,
    types: [...typeCounts.entries()]
      .map(([slug, v]) => ({ slug, label: v.label, count: v.count }))
      .sort((a, b) => b.count - a.count),
    towns: [...townCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12),
    eventDays: [...daySet].sort(),
    next30,
    months: [...monthCounts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({ key, label: monthLabel(key), count })),
    counts: {
      graded: base.filter((i) => i.grading).length,
      bookable: base.filter((i) => i.hasBooking).length,
      featured: base.filter((i) => i.tier === "PREMIUM").length,
      free: base.filter(isFree).length,
    },
  };
}
