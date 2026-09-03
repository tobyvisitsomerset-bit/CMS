/* eslint-disable @typescript-eslint/no-explicit-any -- config is arbitrary per-block-type JSON, typed loosely by design */

import { Star, MapPin, CalendarDays, Search } from "lucide-react";
import type { Listing, ListingCategory } from "@prisma/client";
import { cn } from "@/lib/utils";

export type ListingsByCategory = Record<ListingCategory, Listing[]>;

function parseBadges(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function tierBadgeLabel(tier: string | null): string | null {
  if (tier === "PLATINUM") return "Platinum Member";
  if (tier === "GOLD") return "Gold Member";
  return null;
}

function Img({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) return <div className={cn("bg-gradient-to-br from-emerald-100 to-emerald-200", className)} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn("object-cover", className)} />;
}

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/10" />
          <div className="relative p-8 text-white">
            <h2 className="font-serif text-3xl font-bold">{config.heading || "Hero heading"}</h2>
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
                <div className="mb-2 flex gap-0.5 text-amber-400">
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
            config.style === "light" ? "bg-neutral-100 text-neutral-900" : "bg-emerald-900 text-white",
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
          <div className="flex h-56 items-center justify-center gap-2 rounded-lg bg-emerald-50 text-emerald-700">
            <MapPin className="h-5 w-5" />
            {config.locationLabel || "Map placeholder"}
          </div>
        </div>
      );

    case "listing_search": {
      const filters: string[] = config.filters ?? [];
      return (
        <div className="border-b bg-white p-6">
          {config.title && <h2 className="font-serif text-2xl font-bold">{config.title}</h2>}
          {config.subtitle && <p className="text-sm text-neutral-500">{config.subtitle}</p>}
          {config.showSearchBar !== false && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border p-3">
              <Search className="h-4 w-4 text-neutral-400" />
              <span className="text-sm text-neutral-400">Search...</span>
            </div>
          )}
          {filters.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <span
                  key={i}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium",
                    i === 0 ? "border-emerald-700 bg-emerald-700 text-white" : "text-neutral-600",
                  )}
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    }

    case "listing_grid": {
      const category = (config.category ?? "ACCOMMODATION") as ListingCategory;
      const items = listings?.[category] ?? [];
      return (
        <div className="p-6">
          {config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className={cn("space-y-4", config.showMap ? "md:col-span-2" : "md:col-span-3")}>
              {items.length === 0 && <p className="text-sm text-neutral-400">No listings in this category yet.</p>}
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-lg border bg-white p-3">
                  <Img src={item.imageUrl ?? undefined} alt="" className="h-24 w-32 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-xs text-neutral-500">{item.location}</p>
                      </div>
                      {tierBadgeLabel(item.membershipTier) && (
                        <span className="shrink-0 rounded bg-purple-800 px-2 py-0.5 text-[10px] font-semibold text-white uppercase">
                          {tierBadgeLabel(item.membershipTier)}
                        </span>
                      )}
                    </div>
                    {item.summary && <p className="mt-1 text-sm text-neutral-600">{item.summary}</p>}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {parseBadges(item.badges).map((b) => (
                        <span key={b} className="rounded border px-1.5 py-0.5 text-[10px] text-neutral-600">
                          {b}
                        </span>
                      ))}
                    </div>
                    {item.priceLabel && <p className="mt-2 text-sm font-semibold">{item.priceLabel}</p>}
                  </div>
                </div>
              ))}
            </div>
            {config.showMap && (
              <div className="flex h-64 items-center justify-center rounded-lg bg-emerald-50 text-sm text-emerald-700 md:h-auto">
                <MapPin className="mr-1 h-4 w-4" /> Live map — same engine as future site
              </div>
            )}
          </div>
        </div>
      );
    }

    case "event_calendar": {
      const events = listings?.EVENT ?? [];
      return (
        <div className="p-6">
          {config.heading && <h3 className="mb-3 text-lg font-semibold">{config.heading}</h3>}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              {events.length === 0 && <p className="text-sm text-neutral-400">No events yet.</p>}
              {events.map((e) => (
                <div key={e.id} className="flex gap-3 rounded-lg border bg-white p-3">
                  <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded bg-neutral-100 text-center">
                    <span className="text-[10px] uppercase text-neutral-500">
                      {e.startDate ? new Date(e.startDate).toLocaleString("en-GB", { month: "short" }) : ""}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {e.startDate ? new Date(e.startDate).getDate() : "—"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{e.name}</p>
                    <p className="text-xs text-neutral-500">{e.location}</p>
                    {e.summary && <p className="mt-1 text-sm text-neutral-600">{e.summary}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex h-48 items-center justify-center gap-2 rounded-lg bg-neutral-50 text-sm text-neutral-500 md:h-auto">
              <CalendarDays className="h-4 w-4" /> Calendar widget
            </div>
          </div>
        </div>
      );
    }

    default:
      return <div className="p-6 text-sm text-neutral-400">Unknown section type: {type}</div>;
  }
}
