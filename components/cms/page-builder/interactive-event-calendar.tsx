"use client";

import { cn } from "@/lib/utils";
import type { ListingWithFacilities } from "@/lib/data/listings";
import { useListingDirectory, type QuickFilterKey } from "./listing-directory-context";

const QUICK_FILTERS: { key: QuickFilterKey; label: string }[] = [
  { key: "this-weekend", label: "This weekend" },
  { key: "this-month", label: "This month" },
  { key: "next-month", label: "Next month" },
  { key: "free", label: "Free" },
];

function EventCard({ event }: { event: ListingWithFacilities }) {
  return (
    <div className="flex gap-3 rounded-lg border bg-white p-3">
      <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded bg-neutral-100 text-center">
        <span className="text-[10px] uppercase text-neutral-500">
          {event.startDate ? new Date(event.startDate).toLocaleString("en-GB", { month: "short" }) : ""}
        </span>
        <span className="text-lg font-bold leading-none">{event.startDate ? new Date(event.startDate).getDate() : "—"}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{event.name}</p>
        <p className="text-xs text-neutral-500">{event.location}</p>
        {event.summary && <p className="mt-1 text-sm text-neutral-600">{event.summary}</p>}
        {event.priceLabel && <p className="mt-1 text-xs font-medium text-neutral-500">{event.priceLabel}</p>}
      </div>
    </div>
  );
}

export function InteractiveEventCalendar({ config, events }: { config: Record<string, unknown>; events: ListingWithFacilities[] }) {
  const directory = useListingDirectory();

  if (!directory) {
    return (
      <div className="p-6">
        {typeof config.heading === "string" && config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
        <div className="space-y-3">
          {events.length === 0 && <p className="text-sm text-neutral-400">No events yet.</p>}
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      </div>
    );
  }

  const { visibleRest, hasMore, loadMore, totalMatches, activeQuickFilters, toggleQuickFilter } = directory;

  return (
    <div className="p-6">
      {typeof config.heading === "string" && config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => {
          const active = activeQuickFilters.has(f.key);
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => toggleQuickFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active ? "border-somerset-green bg-somerset-green text-white" : "text-neutral-600 hover:border-somerset-green hover:text-somerset-green",
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>
      {totalMatches === 0 ? (
        <p className="text-sm text-neutral-400">No events match your filters.</p>
      ) : (
        <div className="space-y-3">
          {visibleRest.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          className="mt-4 w-full rounded-lg border border-somerset-green py-2 text-sm font-medium text-somerset-green transition-colors hover:bg-somerset-green/10"
        >
          Load more
        </button>
      )}
    </div>
  );
}
