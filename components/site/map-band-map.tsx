"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-white/10" />,
});

export function MapBandMap({ pins }: { pins: { id: string; lat: number; lng: number; title: string; href: string }[] }) {
  return <LeafletMap pins={pins} zoom={9} height="100%" />;
}
