"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-56 animate-pulse rounded-2xl bg-somerset-green/10" />,
});

// Leaflet touches `window` at import time, so it can only ever run in the
// browser — `ssr: false` above opts this whole component out of the RSC
// prerender pass rather than crashing on the server.
export function SinglePinMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  return <LeafletMap pins={[{ id: "single", lat, lng, title }]} center={[lat, lng]} zoom={15} height="14rem" />;
}
