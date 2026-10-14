import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";

const MAX_IDS = 50;

// Public, unauthenticated by design — resolves ids from a shared trip link
// (?add=a,b,c) or a saved trip into real page details. PUBLISHED-only is
// load-bearing: a shared link must never leak a DRAFT/archived page's
// existence. Returns only fields that are already public on the page itself.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids") ?? "";
  const ids = Array.from(new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))).slice(0, MAX_IDS);

  if (ids.length === 0) return NextResponse.json({ items: [] });

  const rows = await prisma.page.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, heroImageUrl: true, subtitle: true, customFields: true },
  });

  const items = rows.map((r) => {
    const info = getBusinessInfo(parseCustomFields(r.customFields));
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      heroImageUrl: r.heroImageUrl,
      town: info?.town ?? null,
      lat: info?.mapLat ?? null,
      lng: info?.mapLng ?? null,
      startDate: info?.startDate ?? null,
      endDate: info?.endDate ?? null,
      admission: info?.admission ? info.admission.slice(0, 120) : null,
      address: info ? [info.address, info.town, info.postcode].filter(Boolean).join(", ") || null : null,
      bookingUrl: info?.bookingUrl ?? null,
      bookingLabel: info?.bookingUrl ? info.bookingLabel : null,
      isStay: r.slug.startsWith("places-to-stay/"),
    };
  });

  return NextResponse.json({ items });
}
