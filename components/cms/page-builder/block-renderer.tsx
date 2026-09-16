/* eslint-disable @typescript-eslint/no-explicit-any -- config is arbitrary per-block-type JSON, typed loosely by design */

import { Star, MapPin } from "lucide-react";
import type { ListingCategory } from "@prisma/client";
import type { ListingWithFacilities } from "@/lib/data/listings";
import { cn } from "@/lib/utils";
import { Img } from "./listing-ui";
import { ListingSearchBar } from "./listing-search-bar";
import { InteractiveListingGrid } from "./interactive-listing-grid";
import { InteractiveEventCalendar } from "./interactive-event-calendar";

export type ListingsByCategory = Record<ListingCategory, ListingWithFacilities[]>;

export function BlockRenderer({
  type,
  config,
  listings,
}: {
  type: string;
  config: Record<string, any>;
  listings?: ListingsByCategory;
}) {
  switch (type) {
    case "hero":
      return (
        <div className="relative flex h-72 items-end overflow-hidden">
          <Img src={config.imageUrl} alt="" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-green/85 via-deep-green/30 to-transparent" />
          <div className="relative p-8 text-white">
            <h2 className="font-serif text-3xl font-black">{config.heading || "Hero heading"}</h2>
            {config.subheading && <p className="mt-1 max-w-lg text-white/90">{config.subheading}</p>}
            {config.ctaLabel && (
              <span className="mt-3 inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-neutral-900">
                {config.ctaLabel}
              </span>
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
          {config.buttonLabel && (
            <span className="mt-4 inline-block rounded-md bg-purple-700 px-5 py-2 text-sm font-semibold text-white">
              {config.buttonLabel}
            </span>
          )}
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

    default:
      return <div className="p-6 text-sm text-neutral-400">Unknown section type: {type}</div>;
  }
}
