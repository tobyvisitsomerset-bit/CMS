import type { Metadata } from "next";
import { getPagesWithCoordinates } from "@/lib/data/pages";
import { InteractiveMapView } from "@/components/map/interactive-map-view";

export const metadata: Metadata = {
  title: "Interactive Map | Visit Somerset",
  description: "Explore places to stay, things to do, food & drink and events across Somerset on one map.",
};

export default async function InteractiveMapPage() {
  const pins = await getPagesWithCoordinates();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl font-black text-stone-900">Explore Somerset on the map</h1>
      <p className="mt-1 text-stone-500">{pins.length} places with a known location.</p>
      <div className="mt-6">
        <InteractiveMapView pins={pins} />
      </div>
    </div>
  );
}
