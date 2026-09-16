"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useListingDirectory, type SortKey } from "./listing-directory-context";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Top rated" },
  { value: "price", label: "Price" },
  { value: "name", label: "Name (A-Z)" },
];

export function ListingSearchBar({ config }: { config: Record<string, unknown> }) {
  const directory = useListingDirectory();
  const staticFilters: string[] = Array.isArray(config.filters) ? (config.filters as string[]) : [];

  return (
    <div className="border-b bg-white p-6">
      {typeof config.title === "string" && config.title && <h2 className="font-serif text-2xl font-bold">{config.title}</h2>}
      {typeof config.subtitle === "string" && config.subtitle && <p className="text-sm text-neutral-500">{config.subtitle}</p>}

      {config.showSearchBar !== false && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border p-3">
          <Search className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={directory?.searchText ?? ""}
            onChange={(e) => directory?.setSearchText(e.target.value)}
            placeholder="Search..."
            className="w-full text-sm text-neutral-700 placeholder:text-neutral-400 focus:outline-none"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Category-style labels authored on the page (e.g. "Hotels", "Self-catering") —
              display-only, since they don't map to a real filterable field on mock Listings. */}
          {staticFilters.map((label, i) => (
            <span
              key={i}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                i === 0 ? "border-somerset-green bg-somerset-green text-white" : "border-neutral-200 text-neutral-500",
              )}
            >
              {label}
            </span>
          ))}
          {staticFilters.length > 0 && directory && directory.chipCandidates.length > 0 && (
            <span className="mx-1 h-4 w-px bg-neutral-200" aria-hidden />
          )}
          {directory?.chipCandidates.map((chip) => {
            const active = directory.activeFacilityIds.has(chip.id);
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => directory.toggleFacility(chip.id)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active ? "border-somerset-green bg-somerset-green text-white" : "text-neutral-600 hover:border-somerset-green hover:text-somerset-green",
                )}
              >
                {chip.name}
              </button>
            );
          })}
        </div>

        {directory && (
          <label className="flex items-center gap-2 text-xs font-medium text-neutral-500">
            Sort
            <select
              value={directory.sortKey}
              onChange={(e) => directory.setSortKey(e.target.value as SortKey)}
              className="rounded-md border px-2 py-1 text-xs text-neutral-700 focus:outline-none"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
