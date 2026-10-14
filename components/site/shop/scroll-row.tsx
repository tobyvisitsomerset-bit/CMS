"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// A horizontally scrolling row with prev/next buttons (the product rows on
// Buy Somerset). Plain scroll-snap, so it still works without JS.
export function ScrollRow({ children, controls }: { children: React.ReactNode; controls?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const by = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" });
  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-2">
        <button type="button" aria-label="Previous products" onClick={() => by(-1)} className="flex size-9 items-center justify-center rounded-full border border-stone-300 hover:border-somerset-green">
          <ChevronLeft className="size-4" />
        </button>
        <button type="button" aria-label="Next products" onClick={() => by(1)} className="flex size-9 items-center justify-center rounded-full border border-stone-300 hover:border-somerset-green">
          <ChevronRight className="size-4" />
        </button>
        {controls}
      </div>
      <div ref={ref} className="flex snap-x gap-4 overflow-x-auto pb-3">
        {children}
      </div>
    </div>
  );
}
