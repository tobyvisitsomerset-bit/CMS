import { prisma } from "@/lib/prisma";

// The "Master page" of the public site (Kentico 11 terminology): the header,
// main navigation and footer that wrap every page. Stored as one JSON
// document under key "master" and edited in any page's Master page tab.
// Everything falls back to these defaults, so an empty database still
// renders a complete site.

export type MasterLink = { label: string; href: string };
export type MasterNavItem = { label: string; slug: string };
export type MasterFooterColumn = { heading: string; links: MasterLink[] };

export type MasterSettings = {
  utilityLinks: MasterLink[];
  mainNav: MasterNavItem[];
  mapLabel: string;
  bookButtonLabel: string;
  bookButtonHref: string;
  newsletterTitle: string;
  newsletterText: string;
  footerTagline: string;
  footerColumns: MasterFooterColumn[];
  legalLinks: MasterLink[];
};

// "__submit-event__" is resolved to the real Submit-an-event page at render time.
export const SUBMIT_EVENT_TOKEN = "__submit-event__";

export const DEFAULT_MASTER: MasterSettings = {
  utilityLinks: [
    { label: "Business", href: "/business" },
    { label: "Bath", href: "/bath" },
    { label: "Taunton", href: "/taunton" },
    { label: "Media", href: "/media" },
    { label: "News", href: "/news" },
  ],
  mainNav: [
    { label: "Book Experiences", slug: "book-experiences" },
    { label: "Discover Somerset", slug: "discover-somerset" },
    { label: "Things to do", slug: "things-to-do" },
    { label: "Places to Stay", slug: "places-to-stay" },
    { label: "Festivals & Events", slug: "festivals-events" },
  ],
  mapLabel: "Map",
  bookButtonLabel: "Book a stay",
  bookButtonHref: "/places-to-stay",
  newsletterTitle: "The Somerset newsletter",
  newsletterText: "What's on, where to stay and a little folklore. Monthly, never more.",
  footerTagline: "The official destination site for Somerset, from Bath to Exmoor.",
  footerColumns: [
    {
      heading: "Discover",
      links: [
        { label: "Inspiration", href: "/discover-somerset/inspiration" },
        { label: "Popular towns", href: "/discover-somerset/popular-somerset-towns" },
        { label: "Travel", href: "/discover-somerset/travel" },
        { label: "Plan your visit", href: "/discover-somerset/plan-your-visit" },
        { label: "Interactive map", href: "/interactive-map" },
      ],
    },
    {
      heading: "Things to do",
      links: [
        { label: "Attractions", href: "/things-to-do/attractions" },
        { label: "Activities", href: "/things-to-do/activities" },
        { label: "Food & drink", href: "/things-to-do/food-drink-more" },
        { label: "Family days out", href: "/things-to-do?q=family" },
        { label: "Buy Somerset", href: "/buy-somerset" },
      ],
    },
    {
      heading: "Stay",
      links: [
        { label: "Hotels", href: "/places-to-stay?type=hotels" },
        { label: "B&Bs", href: "/places-to-stay?type=b-bs-guest-houses" },
        { label: "Self-catering", href: "/places-to-stay?type=self-catering" },
        { label: "Camping & glamping", href: "/places-to-stay?type=camping-holiday-parks" },
        { label: "Book experiences", href: "/book-experiences" },
      ],
    },
    {
      heading: "Business",
      links: [
        { label: "Membership", href: "/business/membership-advertising" },
        { label: "Submit an event", href: SUBMIT_EVENT_TOKEN },
        { label: "Media & press", href: "/media" },
        { label: "News", href: "/news" },
        { label: "Contact us", href: "/contact-us" },
      ],
    },
  ],
  legalLinks: [
    { label: "Terms of use", href: "/terms-of-use" },
    { label: "Cookie policy", href: "/cookie-policy" },
    { label: "Accessibility", href: "/accessibility" },
    { label: "Site map", href: "/site-map" },
  ],
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function links(v: unknown, fallback: MasterLink[]): MasterLink[] {
  if (!Array.isArray(v)) return fallback;
  return v
    .filter((l): l is MasterLink => !!l && typeof l.label === "string" && typeof l.href === "string")
    .map((l) => ({ label: l.label.trim(), href: l.href.trim() }))
    .filter((l) => l.label && l.href);
}

export function normaliseMaster(raw: unknown): MasterSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof MasterSettings, unknown>>;
  const nav = Array.isArray(r.mainNav)
    ? (r.mainNav as MasterNavItem[])
        .filter((n) => n && typeof n.label === "string" && typeof n.slug === "string")
        .map((n) => ({ label: n.label.trim(), slug: n.slug.trim().replace(/^\/+|\/+$/g, "") }))
        .filter((n) => n.label && n.slug)
    : DEFAULT_MASTER.mainNav;
  const cols = Array.isArray(r.footerColumns)
    ? (r.footerColumns as MasterFooterColumn[])
        .filter((c) => c && typeof c.heading === "string")
        .map((c) => ({ heading: c.heading.trim(), links: links(c.links, []) }))
        .filter((c) => c.heading)
    : DEFAULT_MASTER.footerColumns;
  return {
    utilityLinks: links(r.utilityLinks, DEFAULT_MASTER.utilityLinks),
    mainNav: nav,
    mapLabel: str(r.mapLabel, DEFAULT_MASTER.mapLabel),
    bookButtonLabel: str(r.bookButtonLabel, DEFAULT_MASTER.bookButtonLabel),
    bookButtonHref: str(r.bookButtonHref, DEFAULT_MASTER.bookButtonHref),
    newsletterTitle: str(r.newsletterTitle, DEFAULT_MASTER.newsletterTitle),
    newsletterText: str(r.newsletterText, DEFAULT_MASTER.newsletterText),
    footerTagline: str(r.footerTagline, DEFAULT_MASTER.footerTagline),
    footerColumns: cols,
    legalLinks: links(r.legalLinks, DEFAULT_MASTER.legalLinks),
  };
}

export async function getMasterSettings(): Promise<MasterSettings> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key: "master" } });
    return normaliseMaster(row ? JSON.parse(row.value) : null);
  } catch {
    // Table not created yet (first request after a deploy) or bad JSON.
    return DEFAULT_MASTER;
  }
}

export async function saveMasterSettings(settings: MasterSettings, userId: string | null) {
  const clean = normaliseMaster(settings);
  await prisma.siteSetting.upsert({
    where: { key: "master" },
    create: { key: "master", value: JSON.stringify(clean), updatedById: userId },
    update: { value: JSON.stringify(clean), updatedById: userId },
  });
  return clean;
}
