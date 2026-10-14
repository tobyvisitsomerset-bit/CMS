"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[20rem] animate-pulse rounded-2xl bg-somerset-green/10" />,
});

export type ExplorerMapPin = {
  id: string;
  title: string;
  slug: string;
  lat: number;
  lng: number;
  priceFrom: number | null;
};

// The map beside (or instead of) the list on the listing pages. Pins are the
// real, currently-filtered results that have real coordinates; price pills
// only appear where a real "from £X" figure could be read from the listing.
export function ExplorerMap({ pins, height = "100%" }: { pins: ExplorerMapPin[]; height?: string }) {
  if (pins.length === 0) {
    return (
      <div className="flex h-full min-h-[20rem] items-center justify-center rounded-2xl bg-cool-grey p-6 text-center text-sm text-stone-500">
        None of these results have a location on the map yet.
      </div>
    );
  }
  return (
    <LeafletMap
      pins={pins.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        title: p.title,
        href: `/${p.slug}`,
        label: p.priceFrom ? `£${Math.round(p.priceFrom)}` : undefined,
      }))}
      zoom={9}
      height={height}
    />
  );
}
