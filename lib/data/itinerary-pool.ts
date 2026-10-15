import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { accessKeys } from "@/lib/accessibility";
import { toLevel } from "@/lib/membership";
import { parsePrice } from "@/lib/data/listing-explorer";
import type { PoolItem, PlaceKind } from "@/lib/itinerary";

// Everything the itinerary builder may suggest: real, published, located
// listings, grouped into stays, things to do, food and drink, and events.
// Nothing here is invented; price is only present when the listing states one.

function kindOf(slug: string): PlaceKind | null {
  if (slug.startsWith("places-to-stay/")) return "stay";
  if (slug.startsWith("festivals-events/")) return "event";
  if (slug.startsWith("things-to-do/food-drink-more")) return "food";
  if (slug.startsWith("things-to-do/")) return "do";
  return null;
}

async function loadPool(): Promise<PoolItem[]> {
  const rows = await prisma.page.findMany({
    where: {
      status: "PUBLISHED",
      linkedPageId: null,
      customFields: { contains: "sz.touristitem" },
      OR: [
        { slug: { startsWith: "places-to-stay/" } },
        { slug: { startsWith: "things-to-do/" } },
        { slug: { startsWith: "festivals-events/" } },
      ],
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
    },
  });

  const out: PoolItem[] = [];
  for (const r of rows) {
    const kind = kindOf(r.slug);
    if (!kind) continue;
    const info = getBusinessInfo(parseCustomFields(r.customFields));
    if (!info || info.mapLat == null || info.mapLng == null) continue;
    // Bounding box for the south west, so a corrupted coordinate never sends
    // someone to the other side of the world.
    if (!(info.mapLat > 50 && info.mapLat < 52 && info.mapLng > -4.2 && info.mapLng < -1.9)) continue;
    const price = parsePrice(info.admission);
    const text = `${r.title} ${decodeKenticoText(r.subtitle) ?? ""} ${(decodeKenticoText(r.bodyContent) ?? "").slice(0, 500)}`.toLowerCase();
    out.push({
      id: r.id,
      kind,
      title: r.title,
      slug: r.slug,
      imageUrl: r.heroImageUrl,
      town: info.town,
      lat: info.mapLat,
      lng: info.mapLng,
      priceFrom: price.from,
      priceUnit: price.unit,
      free: !!info.admission && /\bfree\b/i.test(info.admission) && !/£/.test(info.admission),
      access: accessKeys(r.customFields),
      level: toLevel(r.membershipTier),
      startDate: info.startDate ? info.startDate.slice(0, 10) : null,
      endDate: (info.endDate ?? info.startDate)?.slice(0, 10) ?? null,
      text,
      bookingUrl: info.bookingUrl,
    });
  }
  return out;
}

export const getItineraryPool = unstable_cache(loadPool, ["itinerary-pool"], { revalidate: 3600, tags: ["listings"] });
