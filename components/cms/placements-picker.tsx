"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type PlacementOption = { id: string; title: string; context: string };

// Tick the landing pages a listing should also appear on. With a cap, the
// boxes stop at that number and the rest are disabled until one is unticked.
export function PlacementsPicker({
  options,
  selected,
  onChange,
  cap,
  homeIds = [],
  readOnly = false,
}: {
  options: PlacementOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** null = no limit (staff). */
  cap: number | null;
  /** Landing pages the page already sits under (shown ticked, locked, not counted). */
  homeIds?: string[];
  readOnly?: boolean;
}) {
  const [q, setQ] = useState("");
  const used = selected.filter((id) => options.some((o) => o.id === id)).length;
  const full = cap != null && used >= cap;
  const term = q.trim().toLowerCase();
  const shown = options.filter((o) => !term || `${o.title} ${o.context}`.toLowerCase().includes(term));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-stone-700">
          {cap == null ? (
            <>Appearing on {used} extra landing page{used === 1 ? "" : "s"}.</>
          ) : (
            <>
              <strong>{used}</strong> of <strong>{cap}</strong> extra landing page{cap === 1 ? "" : "s"} used.
            </>
          )}
        </p>
        {options.length > 8 && (
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search landing pages"
            className="h-9 w-56 rounded-lg border border-stone-300 px-3 text-sm"
          />
        )}
      </div>
      {full && cap != null && (
        <p className="rounded-xl bg-cool-grey px-3 py-2 text-xs text-stone-700">
          You have used all {cap}. Untick one to choose another. A higher membership level allows more.
        </p>
      )}
      <div className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
        {shown.map((o) => {
          const home = homeIds.includes(o.id);
          const on = home || selected.includes(o.id);
          const disabled = readOnly || home || (!on && full);
          return (
            <label
              key={o.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3 text-sm",
                on ? "border-somerset-green bg-somerset-green/5" : "border-stone-200",
                disabled && !on && "opacity-50",
                disabled ? "cursor-not-allowed" : "cursor-pointer",
              )}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[#3d685b]"
                checked={on}
                disabled={disabled}
                onChange={() => onChange(on ? selected.filter((id) => id !== o.id) : [...selected, o.id])}
              />
              <span>
                <strong className="text-stone-900">{o.title}</strong>
                {o.context && <span className="block text-xs text-stone-500">{o.context}</span>}
                {home && <span className="block text-xs font-semibold text-somerset-green">Where this page already sits</span>}
              </span>
            </label>
          );
        })}
        {shown.length === 0 && <p className="text-sm text-stone-500">No landing pages match.</p>}
      </div>
    </div>
  );
}
