"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Itinerary } from "@/lib/itinerary";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-2xl bg-somerset-green/10" />,
});

// The plan on a map: the stay, and each day's stops numbered in order.
export function DayMap({ it }: { it: Itinerary }) {
  const [day, setDay] = useState(0);
  const d = it.days[Math.min(day, it.days.length - 1)];
  if (!d) return null;

  const pins = [
    ...(it.stay ? [{ id: `stay-${it.stay.uid}`, lat: it.stay.lat, lng: it.stay.lng, title: `Stay: ${it.stay.title}`, label: "Stay", href: `/${it.stay.slug}` }] : []),
    ...d.items.map((i, idx) => ({ id: i.uid, lat: i.lat, lng: i.lng, title: i.title, label: String(idx + 1), href: `/${i.slug}` })),
  ];
  if (pins.length === 0) return null;

  return (
    <section className="mt-8 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-2xl font-black text-stone-900">On the map</h2>
        <div className="flex flex-wrap gap-1.5">
          {it.days.map((x, i) => (
            <button
              key={x.date}
              type="button"
              onClick={() => setDay(i)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold",
                i === day ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 bg-white text-stone-700 hover:border-somerset-green",
              )}
            >
              Day {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        {/* key so the map re-fits when the day changes */}
        <LeafletMap key={`${d.date}-${pins.length}`} pins={pins} height="20rem" />
      </div>
      <p className="mt-2 text-xs text-stone-500">Numbers show the order of the day. Distances are as the crow flies, so allow extra for the roads.</p>
    </section>
  );
}
