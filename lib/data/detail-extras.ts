import { prisma } from "@/lib/prisma";
import { getPagesWithCoordinates, type PageMapPin } from "@/lib/data/pages";
import { getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";

export type NearbyPlace = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  miles: number;
  town: string | null;
  section: string;
};

export type SeasonEvent = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string | null;
  town: string | null;
};

export type DetailExtras = {
  // The closest real business/attraction pages by straight-line distance.
  nearbyPlaces: NearbyPlace[];
  // Events only: the closest real places to stay.
  nearbyStays: NearbyPlace[];
  // Events only: other upcoming events in the same section/folder.
  season: { label: string; events: SeasonEvent[] } | null;
};

export const EMPTY_EXTRAS: DetailExtras = { nearbyPlaces: [], nearbyStays: [], season: null };

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toNearby(pin: PageMapPin, miles: number): NearbyPlace {
  return {
    id: pin.id,
    title: pin.title,
    slug: pin.slug,
    heroImageUrl: pin.heroImageUrl,
    miles,
    town: pin.town,
    section: pin.slug.split("/")[0],
  };
}

export function formatMiles(miles: number): string {
  if (miles < 0.2) return "Next door";
  return `${miles < 10 ? miles.toFixed(1) : Math.round(miles)} mi away`;
}

// Real, computed-from-coordinates "what's near here" for detail pages. No
// travel times are invented — only straight-line distance, labelled as such.
export async function getDetailExtras(page: {
  id: string;
  slug: string;
  parentId: string | null;
  customFields: string | null;
}): Promise<DetailExtras> {
  const info = getBusinessInfo(parseCustomFields(page.customFields));
  if (!info) return EMPTY_EXTRAS;

  const isEvent = !!info.startDate;
  const extras: DetailExtras = { nearbyPlaces: [], nearbyStays: [], season: null };

  if (info.mapLat != null && info.mapLng != null) {
    const here = { lat: info.mapLat, lng: info.mapLng };
    const pins = await getPagesWithCoordinates();
    const candidates = pins
      .filter((p) => p.id !== page.id && p.isBusiness)
      .map((p) => ({ pin: p, miles: haversineMiles(here, p) }))
      .filter((c) => c.miles <= 25)
      .sort((a, b) => a.miles - b.miles);

    const isStay = page.slug.startsWith("places-to-stay/");
    const isStayPin = (p: PageMapPin) => p.slug.startsWith("places-to-stay/");
    // Things worth doing nearby: real, non-event, non-accommodation places.
    extras.nearbyPlaces = candidates
      .filter((c) => !c.pin.startDate && !isStayPin(c.pin))
      .slice(0, 4)
      .map((c) => toNearby(c.pin, c.miles));
    // Somewhere to stay nearby, for everything that isn't itself a stay.
    if (!isStay) {
      extras.nearbyStays = candidates
        .filter((c) => isStayPin(c.pin))
        .slice(0, 3)
        .map((c) => toNearby(c.pin, c.miles));
    }
  }

  if (isEvent && page.parentId) {
    const [parent, siblings] = await Promise.all([
      prisma.page.findUnique({ where: { id: page.parentId }, select: { title: true } }),
      prisma.page.findMany({
        where: { parentId: page.parentId, status: "PUBLISHED", linkedPageId: null, id: { not: page.id } },
        select: { id: true, title: true, slug: true, customFields: true },
        take: 60,
      }),
    ]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const events = siblings
      .map((s) => {
        const i = getBusinessInfo(parseCustomFields(s.customFields));
        return i?.startDate
          ? ({ id: s.id, title: s.title, slug: s.slug, startDate: i.startDate, endDate: i.endDate, town: i.town } as SeasonEvent)
          : null;
      })
      .filter((e): e is SeasonEvent => !!e && new Date(e.endDate ?? e.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 8);
    if (events.length > 0) extras.season = { label: parent?.title ?? "season", events };
  }

  return extras;
}
