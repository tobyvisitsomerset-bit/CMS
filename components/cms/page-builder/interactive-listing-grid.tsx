"use client";

import type { ListingWithFacilities } from "@/lib/data/listings";
import { Img, tierBadgeLabel } from "./listing-ui";
import { useListingDirectory } from "./listing-directory-context";

function ListingCard({ item, featured = false }: { item: ListingWithFacilities; featured?: boolean }) {
  return (
    <div className={featured ? "flex flex-col gap-4 rounded-xl border-2 border-damson bg-white p-4 sm:flex-row" : "flex gap-4 rounded-lg border bg-white p-3"}>
      <Img src={item.imageUrl} alt="" className={featured ? "h-48 w-full shrink-0 rounded-lg sm:h-auto sm:w-56" : "h-24 w-32 shrink-0 rounded-md"} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={featured ? "font-serif text-lg font-black" : "font-semibold"}>{item.name}</p>
            <p className="text-xs text-neutral-500">{item.location}</p>
          </div>
          {tierBadgeLabel(item.membershipTier) && (
            <span className="shrink-0 rounded-full bg-damson px-2.5 py-0.5 text-[10px] font-semibold text-white uppercase">
              {featured ? "Featured Member" : tierBadgeLabel(item.membershipTier)}
            </span>
          )}
        </div>
        {item.summary && <p className="mt-1 text-sm text-neutral-600">{item.summary}</p>}
        <div className="mt-2 flex flex-wrap gap-1">
          {item.facilities.map((f) => (
            <span key={f.id} className="rounded border px-1.5 py-0.5 text-[10px] text-neutral-600">
              {f.name}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-3">
          {item.priceLabel && <p className="text-sm font-semibold">{item.priceLabel}</p>}
          {item.rating != null && (
            <p className="text-xs text-neutral-500">
              {item.rating.toFixed(1)}★{item.reviewCount ? ` (${item.reviewCount})` : ""}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function InteractiveListingGrid({ config, items }: { config: Record<string, unknown>; items: ListingWithFacilities[] }) {
  const directory = useListingDirectory();

  if (!directory) {
    // No listing_search block on this page to provide shared state — fall
    // back to a plain, non-interactive list of everything in the category.
    return (
      <div className="p-6">
        {typeof config.heading === "string" && config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
        <div className="space-y-4">
          {items.length === 0 && <p className="text-sm text-neutral-400">No listings in this category yet.</p>}
          {items.map((item) => (
            <ListingCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    );
  }

  const { featured, visibleRest, hasMore, loadMore, totalMatches } = directory;

  return (
    <div className="p-6">
      {typeof config.heading === "string" && config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
      {totalMatches === 0 ? (
        <p className="text-sm text-neutral-400">No listings match your filters.</p>
      ) : (
        <div className="space-y-4">
          {featured && <ListingCard item={featured} featured />}
          {visibleRest.map((item) => (
            <ListingCard key={item.id} item={item} />
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
