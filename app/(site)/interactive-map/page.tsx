import type { Metadata } from "next";
import { getPagesWithCoordinates } from "@/lib/data/pages";
import { MapExplorer, type MapPinInput } from "@/components/map/map-explorer";

export const metadata: Metadata = {
  title: "Interactive Map | Visit Somerset",
  description: "Explore places to stay, things to do, food & drink and events across Somerset on one map.",
};

function layerFor(slug: string, isBusiness: boolean, startDate: string | null): MapPinInput["layer"] {
  if (startDate) return "events";
  if (slug.startsWith("places-to-stay/")) return "stay";
  if (slug.startsWith("things-to-do/food-drink-more")) return "eat";
  if (slug.startsWith("festivals-events/")) return "events";
  if (isBusiness) return "do";
  return "places";
}

export default async function InteractiveMapPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const all = await getPagesWithCoordinates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pins: MapPinInput[] = all
    // Events that have already finished don't belong on a "what's here" map.
    .filter((p) => !p.startDate || new Date(p.endDate ?? p.startDate) >= today)
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      lat: p.lat,
      lng: p.lng,
      town: p.town,
      heroImageUrl: p.heroImageUrl,
      layer: layerFor(p.slug, p.isBusiness, p.startDate),
      startDate: p.startDate,
      endDate: p.endDate,
    }));

  return <MapExplorer pins={pins} initialQuery={q ?? ""} />;
}
