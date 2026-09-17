"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { PageMapPin } from "@/lib/data/pages";
import { NAV_LINKS, labelForSlugSegment } from "@/lib/site-nav";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-[32rem] animate-pulse rounded-2xl bg-somerset-green/10" />,
});

// The tree also has ~30+ stray unmerged Kentico root folders (bath, taunton,
// virtual-highstreet, ...) alongside the handful of real curated sections —
// same known, separately-tracked cleanup problem the header nav already
// works around. Only chip the real sections; everything else buckets into
// "Other" rather than surfacing that mess as filter options.
const KNOWN_SLUGS = NAV_LINKS.map((l) => l.slug).filter((s) => s !== "interactive-map");

// Match against the pin's full slug (not just its root segment) and prefer
// the longest/most-specific matching nav slug — otherwise a nested section
// like "things-to-do/food-drink-more" would fold into its parent "things-to-do"
// chip instead of getting its own.
function chipCategoryFor(pin: PageMapPin): string {
  let best: string | null = null;
  for (const slug of KNOWN_SLUGS) {
    if (pin.slug === slug || pin.slug.startsWith(`${slug}/`)) {
      if (!best || slug.length > best.length) best = slug;
    }
  }
  return best ?? "other";
}

export function InteractiveMapView({ pins }: { pins: PageMapPin[] }) {
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const pin of pins) seen.add(chipCategoryFor(pin));
    return Array.from(seen).sort((a, b) => (a === "other" ? 1 : b === "other" ? -1 : a.localeCompare(b)));
  }, [pins]);

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const filteredPins = activeCategory ? pins.filter((p) => chipCategoryFor(p) === activeCategory) : pins;

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === null ? "border-somerset-green bg-somerset-green text-white" : "text-neutral-600 hover:border-somerset-green hover:text-somerset-green",
          )}
        >
          All ({pins.length})
        </button>
        {categories.map((category) => {
          const count = pins.filter((p) => chipCategoryFor(p) === category).length;
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active ? "border-somerset-green bg-somerset-green text-white" : "text-neutral-600 hover:border-somerset-green hover:text-somerset-green",
              )}
            >
              {category === "other" ? "Other" : labelForSlugSegment(category)} ({count})
            </button>
          );
        })}
      </div>

      <LeafletMap
        pins={filteredPins.map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, title: p.title, href: `/${p.slug}` }))}
        zoom={9}
        height="32rem"
      />
    </div>
  );
}
