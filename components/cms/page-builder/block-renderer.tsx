/* eslint-disable @typescript-eslint/no-explicit-any -- config is arbitrary per-block-type JSON, typed loosely by design */

import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { ListingCategory } from "@prisma/client";
import type { ListingWithFacilities } from "@/lib/data/listings";
import type { ExploreAreaTile, FeaturedPageTile, TownTile } from "@/lib/data/pages";
import { cn } from "@/lib/utils";
import { Img } from "./listing-ui";
import { ListingSearchBar } from "./listing-search-bar";
import { InteractiveListingGrid } from "./interactive-listing-grid";
import { InteractiveEventCalendar } from "./interactive-event-calendar";
import { ExploreAreaTiles } from "@/components/site/explore-area-tiles";
import { HomeTeaserSection } from "@/components/site/home-teaser-section";
import { PageTileGrid } from "@/components/site/page-tile-grid";
import { TownsTileRow } from "@/components/site/towns-tile-row";
import { HomepageSearchBar } from "@/components/site/homepage-search-bar";

export type ListingsByCategory = Record<ListingCategory, ListingWithFacilities[]>;

// Shown in the Design tab's client-side live preview, which can't run the
// Prisma queries these block types need — real data only resolves on the
// actual server-rendered page/CMS preview, which always pass `realData`.
function RealDataUnavailable() {
  return (
    <div className="p-8 text-sm text-neutral-400">Live preview isn&apos;t available for real data — save to see it update on the real page.</div>
  );
}

// Real-data resolved for one block instance (Phase 10) — fetched once upfront
// by the page route per block, same "fetch once, pass down flat" pattern
// `listings` already established, just keyed per-block since each instance's
// own config decides what it needs. See lib/data/block-data.ts.
export type RealBlockData =
  | { type: "explore_area_tiles"; tiles: ExploreAreaTile[] }
  | { type: "real_teaser"; items: FeaturedPageTile[] }
  | { type: "towns_row"; towns: TownTile[] };

export function BlockRenderer({
  type,
  config,
  listings,
  realData,
}: {
  type: string;
  config: Record<string, any>;
  listings?: ListingsByCategory;
  realData?: RealBlockData;
}) {
  switch (type) {
    case "hero":
      return (
        <div className="relative flex min-h-72 items-end overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green">
          <Img src={config.imageUrl} alt="" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-green/85 via-deep-green/30 to-transparent" />
          <div
            className={cn(
              "relative flex w-full flex-col gap-6 p-8 text-white",
              config.showSearchBar && "lg:flex-row lg:items-center lg:justify-between",
            )}
          >
            <div className={cn(config.showSearchBar && "max-w-xl")}>
              <h2 className="font-serif text-3xl font-black">{config.heading || "Hero heading"}</h2>
              {config.subheading && <p className="mt-1 max-w-lg text-white/90">{config.subheading}</p>}
              {config.ctaLabel &&
                (config.ctaUrl ? (
                  <Link href={config.ctaUrl} className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900">
                    {config.ctaLabel}
                  </Link>
                ) : (
                  <span className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900">
                    {config.ctaLabel}
                  </span>
                ))}
            </div>
            {config.showSearchBar && (
              <div className="w-full lg:w-auto">
                <HomepageSearchBar />
              </div>
            )}
          </div>
        </div>
      );

    case "text":
      return (
        <div className="p-8">
          {config.heading && <h3 className="mb-2 text-xl font-semibold">{config.heading}</h3>}
          <p className="whitespace-pre-wrap text-neutral-600">{config.body || "Body text..."}</p>
        </div>
      );

    case "gallery": {
      const urls: string[] = config.imageUrls ?? [];
      return (
        <div className="p-8">
          {urls.length === 0 ? (
            <p className="text-sm text-neutral-400">No images added yet.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {urls.map((u, i) => (
                <Img key={i} src={u} alt="" className="h-28 w-full rounded-md" />
              ))}
            </div>
          )}
        </div>
      );
    }

    case "cards": {
      const items: { title: string; description?: string; imageUrl?: string; badge?: string }[] =
        config.items ?? [];
      const columns = Number(config.columns) || 3;
      return (
        <div className="p-8">
          {config.heading && <h3 className="mb-4 text-xl font-semibold">{config.heading}</h3>}
          {items.length === 0 ? (
            <p className="text-sm text-neutral-400">No cards added yet.</p>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
              {items.map((item, i) => (
                <div key={i} className="overflow-hidden rounded-lg border bg-white">
                  <div className="relative">
                    <Img src={item.imageUrl} alt="" className="h-32 w-full" />
                    {item.badge && (
                      <span className="absolute left-2 top-2 rounded bg-purple-800 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    {item.description && <p className="mt-1 text-xs text-neutral-500">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "video":
      return (
        <div className="p-8">
          {config.heading && <h3 className="mb-2 text-xl font-semibold">{config.heading}</h3>}
          <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-900 text-white">
            {config.videoUrl ? "▶ " + config.videoUrl : "No video URL set"}
          </div>
        </div>
      );

    case "accordion":
    case "faq": {
      const items: { question: string; answer: string }[] = config.items ?? [];
      return (
        <div className="p-8">
          {config.heading && <h3 className="mb-4 text-xl font-semibold">{config.heading}</h3>}
          <div className="divide-y rounded-lg border">
            {items.length === 0 && <p className="p-4 text-sm text-neutral-400">No items yet.</p>}
            {items.map((item, i) => (
              <details key={i} className="group p-4">
                <summary className="cursor-pointer text-sm font-medium">{item.question}</summary>
                <p className="mt-2 text-sm text-neutral-500">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      );
    }

    case "testimonials": {
      const items: { quote: string; author: string; rating?: number }[] = config.items ?? [];
      return (
        <div className="bg-neutral-50 p-8">
          {config.heading && <h3 className="mb-4 text-xl font-semibold">{config.heading}</h3>}
          <div className="grid grid-cols-3 gap-4">
            {items.map((item, i) => (
              <div key={i} className="rounded-lg border bg-white p-4">
                <div className="mb-2 flex gap-0.5 text-damson">
                  {Array.from({ length: item.rating ?? 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm italic text-neutral-600">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-2 text-xs font-medium text-neutral-500">{item.author}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "cta_banner":
      return (
        <div
          className={cn(
            "p-10 text-center",
            config.style === "light" ? "bg-neutral-100 text-neutral-900" : "bg-deep-green text-white",
          )}
        >
          <h3 className="text-2xl font-bold">{config.heading || "Call to action"}</h3>
          {config.subtext && <p className="mt-1 opacity-90">{config.subtext}</p>}
          {config.buttonLabel &&
            (config.buttonUrl ? (
              <Link href={config.buttonUrl} className="mt-4 inline-block rounded-full bg-damson px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90">
                {config.buttonLabel}
              </Link>
            ) : (
              <span className="mt-4 inline-block rounded-full bg-damson px-5 py-2 text-sm font-semibold text-white">
                {config.buttonLabel}
              </span>
            ))}
        </div>
      );

    case "map":
      return (
        <div className="p-8">
          {config.heading && <h3 className="mb-2 text-xl font-semibold">{config.heading}</h3>}
          <div className="flex h-56 items-center justify-center gap-2 rounded-lg bg-somerset-green/10 text-somerset-green">
            <MapPin className="h-5 w-5" />
            {config.locationLabel || "Map placeholder"}
          </div>
        </div>
      );

    case "listing_search":
      return <ListingSearchBar config={config} />;

    case "listing_grid": {
      const category = (config.category ?? "ACCOMMODATION") as ListingCategory;
      const items = listings?.[category] ?? [];
      return <InteractiveListingGrid config={config} items={items} />;
    }

    case "event_calendar": {
      const events = listings?.EVENT ?? [];
      return <InteractiveEventCalendar config={config} events={events} />;
    }

    case "explore_area_tiles": {
      if (!realData) return <RealDataUnavailable />;
      const tiles = realData.type === "explore_area_tiles" ? realData.tiles : [];
      return (
        <div className="p-8">
          <ExploreAreaTiles tiles={tiles} />
        </div>
      );
    }

    case "real_teaser": {
      if (!realData) return <RealDataUnavailable />;
      const items = realData.type === "real_teaser" ? realData.items : [];
      return (
        <div className="p-8">
          <HomeTeaserSection title={config.title || "Somerset"} seeAllHref={config.seeAllHref || "#"}>
            <PageTileGrid tiles={items} />
          </HomeTeaserSection>
        </div>
      );
    }

    case "towns_row": {
      if (!realData) return <RealDataUnavailable />;
      const towns = realData.type === "towns_row" ? realData.towns : [];
      return (
        <div className="p-8">
          <TownsTileRow towns={towns} title={config.title} />
        </div>
      );
    }

    default:
      return <div className="p-6 text-sm text-neutral-400">Unknown section type: {type}</div>;
  }
}
