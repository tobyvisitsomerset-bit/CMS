/* eslint-disable @typescript-eslint/no-explicit-any -- config is arbitrary per-block-type JSON, typed loosely by design */

import Link from "next/link";
import { Star, MapPin } from "lucide-react";
import type { ListingCategory } from "@prisma/client";
import type { ListingWithFacilities } from "@/lib/data/listings";
import type { ExploreAreaTile, FeaturedPageTile, TownTile } from "@/lib/data/pages";
import type { ExplorerKind, ExplorerResult } from "@/lib/data/listing-explorer";
import { cn } from "@/lib/utils";
import { Img } from "./listing-ui";
import { ListingSearchBar } from "./listing-search-bar";
import { InteractiveListingGrid } from "./interactive-listing-grid";
import { InteractiveEventCalendar } from "./interactive-event-calendar";
import { HomepageSearchBar } from "@/components/site/homepage-search-bar";
import { AreaTiles, EventsTeaser, MapBand, MoodTiles, PartnersRow, StaysTeaser, TownsRow } from "@/components/site/home-sections";
import { ListingExplorer } from "@/components/site/explorer/listing-explorer";
import { EventsExplorer } from "@/components/site/explorer/events-explorer";
import { ExperiencesHubView } from "@/components/site/explorer/experiences-hub";
import { ProducerShop } from "@/components/site/shop/producer-shop";
import { BuyPanel } from "@/components/site/shop/buy-panel";
import type { ShopProducer } from "@/lib/data/shop";
import { ContentPanel } from "@/components/site/content-panel";
import {
  AdBar,
  AvailabilitySearch,
  ButtonWidget,
  ContactFormWidget,
  EmbedWidget,
  EventFormWidget,
  NewsletterBar,
  PageCards,
  SocialPanel,
  Spotlight,
} from "@/components/site/small-widgets";
import type { ExperiencesHub } from "@/lib/data/experiences";

export type ListingsByCategory = Record<ListingCategory, ListingWithFacilities[]>;

// Shown in the Design tab's client-side live preview, which can't run the
// Prisma queries these block types need — real data only resolves on the
// actual server-rendered page/CMS preview, which always pass `realData`.
function RealDataUnavailable() {
  return (
    <div className="p-8 text-sm text-neutral-400">Live preview isn&apos;t available for real data — save to see it update on the real page.</div>
  );
}

// Real-data resolved for one block instance — fetched once upfront by the
// page route per block, same "fetch once, pass down flat" pattern `listings`
// already established, just keyed per-block since each instance's own config
// decides what it needs. See lib/data/block-data.ts.
export type RealBlockData =
  | { type: "explore_area_tiles"; tiles: ExploreAreaTile[] }
  | { type: "real_teaser"; items: FeaturedPageTile[]; total: number }
  | { type: "towns_row"; towns: TownTile[] }
  | { type: "mood_tiles"; moods: { label: string; query: string; count: number }[] }
  | { type: "map_band"; pins: { id: string; lat: number; lng: number; title: string; href: string }[] }
  | { type: "partners_row"; items: FeaturedPageTile[] }
  | {
      type: "page_cards";
      cards: { id: string; title: string; subtitle: string | null; slug: string; heroImageUrl: string | null }[];
    }
  | { type: "producer_shop"; producers: ShopProducer[] }
  | { type: "buy_panel"; producer: ShopProducer | null }
  | { type: "experiences_hub"; hub: ExperiencesHub; searchParams: Record<string, string | undefined> }
  | {
      type: "listing_explorer";
      kind: ExplorerKind;
      result: ExplorerResult;
      searchParams: Record<string, string | undefined>;
      submitHref: string | null;
      carnival: { title: string; summary: string | null; href: string } | null;
    };

function Section({ children, className, tone }: { children: React.ReactNode; className?: string; tone?: "grey" | "green" }) {
  return (
    <section className={cn("px-6 py-12", tone === "grey" && "bg-cool-grey", tone === "green" && "bg-somerset-green text-white", className)}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );
}

export function BlockRenderer({
  type,
  config,
  listings,
  realData,
  pageSlug,
  pageTitle,
  pageId,
}: {
  type: string;
  config: Record<string, any>;
  listings?: ListingsByCategory;
  realData?: RealBlockData;
  pageSlug?: string;
  pageTitle?: string;
  pageId?: string;
}) {
  switch (type) {
    case "hero": {
      if (config.showSearchBar) {
        return (
          <section className="relative isolate bg-white">
            <div className="relative isolate overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green text-white">
              {config.imageUrl && <Img src={config.imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full" />}
              <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep-green/50 via-deep-green/30 to-deep-green/70" />
              <div className="mx-auto max-w-4xl px-6 pt-20 pb-44 text-center sm:pt-28">
                <p className="text-[11px] font-semibold tracking-[0.28em] text-white/80 uppercase">
                  {config.eyebrow || "Somerset · England's West Country"}
                </p>
                <h1 className="mt-4 font-serif text-6xl leading-none font-black tracking-tight sm:text-8xl">
                  {config.heading || "Be enchanted"}
                </h1>
                {config.subheading && <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90">{config.subheading}</p>}
                {config.ctaLabel && config.ctaUrl && (
                  <Link href={config.ctaUrl} className="mt-6 inline-block rounded-full bg-damson px-6 py-3 text-sm font-bold text-white hover:opacity-90">
                    {config.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
            <div className="relative z-10 mx-auto -mt-32 max-w-5xl px-6">
              <HomepageSearchBar />
            </div>
          </section>
        );
      }
      return (
        <div className="relative flex min-h-72 items-end overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green">
          <Img src={config.imageUrl} alt="" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-deep-green/85 via-deep-green/30 to-transparent" />
          <div className="relative mx-auto w-full max-w-7xl p-8 text-white">
            {config.eyebrow && <p className="mb-2 text-[11px] font-semibold tracking-[0.22em] text-white/80 uppercase">{config.eyebrow}</p>}
            <h2 className="font-serif text-4xl font-black">{config.heading || "Hero heading"}</h2>
            {config.subheading && <p className="mt-2 max-w-xl text-white/90">{config.subheading}</p>}
            {config.ctaLabel &&
              (config.ctaUrl ? (
                <Link href={config.ctaUrl} className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-deep-green">
                  {config.ctaLabel}
                </Link>
              ) : (
                <span className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-deep-green">{config.ctaLabel}</span>
              ))}
          </div>
        </div>
      );
    }

    case "book_strip": {
      const buttons: { label: string; url: string }[] = config.buttons ?? [];
      return (
        <section className="bg-cool-grey px-6 pt-10 pb-10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
            <p className="font-serif text-xl font-black text-stone-900">{config.heading || "Ready to book?"}</p>
            {buttons.map((b, i) => (
              <Link
                key={i}
                href={b.url || "#"}
                className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                {b.label}
              </Link>
            ))}
            {config.linkLabel && config.linkUrl && (
              <Link href={config.linkUrl} className="ml-1 text-sm font-bold text-damson hover:underline">
                {config.linkLabel}
              </Link>
            )}
          </div>
        </section>
      );
    }

    case "text":
      return (
        <Section>
          <div className="max-w-3xl">
            {config.heading && <h3 className="mb-3 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
            <p className="whitespace-pre-wrap text-stone-600">{config.body || "Body text..."}</p>
          </div>
        </Section>
      );

    case "gallery": {
      const urls: string[] = config.imageUrls ?? [];
      return (
        <Section>
          {urls.length === 0 ? (
            <p className="text-sm text-neutral-400">No images added yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {urls.map((u, i) => (
                <Img key={i} src={u} alt="" className="h-40 w-full rounded-2xl" />
              ))}
            </div>
          )}
        </Section>
      );
    }

    case "cards": {
      const items: { title: string; description?: string; imageUrl?: string; badge?: string }[] = config.items ?? [];
      const columns = Number(config.columns) || 3;
      return (
        <Section>
          {config.heading && <h3 className="mb-5 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
          {items.length === 0 ? (
            <p className="text-sm text-neutral-400">No cards added yet.</p>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
              {items.map((item, i) => (
                <div key={i} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
                  <div className="relative">
                    <Img src={item.imageUrl} alt="" label={item.title} className="h-40 w-full" />
                    {item.badge && (
                      <span className="absolute left-3 top-3 rounded-full bg-damson px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-serif text-lg font-black text-stone-900">{item.title}</p>
                    {item.description && <p className="mt-1 text-sm text-stone-500">{item.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      );
    }

    case "video":
      return (
        <Section>
          {config.heading && <h3 className="mb-3 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
          <div className="flex aspect-video items-center justify-center rounded-3xl bg-neutral-900 text-white">
            {config.videoUrl ? "▶ " + config.videoUrl : "No video URL set"}
          </div>
        </Section>
      );

    case "accordion":
    case "faq": {
      const items: { question: string; answer: string }[] = config.items ?? [];
      return (
        <Section>
          <div className="max-w-3xl">
            {config.heading && <h3 className="mb-4 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
            <div className="divide-y rounded-3xl border border-stone-200">
              {items.length === 0 && <p className="p-4 text-sm text-neutral-400">No items yet.</p>}
              {items.map((item, i) => (
                <details key={i} className="group p-5">
                  <summary className="cursor-pointer text-sm font-semibold text-stone-900">{item.question}</summary>
                  <p className="mt-2 text-sm text-stone-600">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </Section>
      );
    }

    case "testimonials": {
      const items: { quote: string; author: string; rating?: number }[] = config.items ?? [];
      return (
        <Section tone="grey">
          {config.heading && <h3 className="mb-5 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
          <div className="grid gap-4 sm:grid-cols-3">
            {items.map((item, i) => (
              <div key={i} className="rounded-3xl bg-white p-5">
                <div className="mb-2 flex gap-0.5 text-damson">
                  {Array.from({ length: item.rating ?? 5 }).map((_, s) => (
                    <Star key={s} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-stone-600 italic">&ldquo;{item.quote}&rdquo;</p>
                <p className="mt-2 text-xs font-medium text-stone-500">{item.author}</p>
              </div>
            ))}
          </div>
        </Section>
      );
    }

    case "cta_banner":
      return (
        <section className="px-6 py-10">
          <div
            className={cn(
              "mx-auto max-w-7xl rounded-[2rem] px-8 py-12 text-center sm:px-14",
              config.style === "light" ? "bg-cool-grey text-stone-900" : "bg-deep-green text-white",
            )}
          >
            <h3 className="font-serif text-3xl font-black sm:text-4xl">{config.heading || "Call to action"}</h3>
            {config.subtext && <p className="mx-auto mt-2 max-w-2xl opacity-90">{config.subtext}</p>}
            {config.buttonLabel &&
              (config.buttonUrl ? (
                <Link href={config.buttonUrl} className="mt-6 inline-block rounded-full bg-damson px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90">
                  {config.buttonLabel}
                </Link>
              ) : (
                <span className="mt-6 inline-block rounded-full bg-damson px-6 py-3 text-sm font-bold text-white">{config.buttonLabel}</span>
              ))}
          </div>
        </section>
      );

    case "map":
      return (
        <Section>
          {config.heading && <h3 className="mb-3 font-serif text-2xl font-black text-stone-900">{config.heading}</h3>}
          <div className="flex h-56 items-center justify-center gap-2 rounded-3xl bg-somerset-green/10 text-somerset-green">
            <MapPin className="h-5 w-5" />
            {config.locationLabel || "Map placeholder"}
          </div>
        </Section>
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
      if (!realData || realData.type !== "explore_area_tiles") return <RealDataUnavailable />;
      return <AreaTiles tiles={realData.tiles} title={config.title} />;
    }

    case "mood_tiles": {
      if (!realData || realData.type !== "mood_tiles") return <RealDataUnavailable />;
      return <MoodTiles eyebrow={config.eyebrow} title={config.title} subtitle={config.subtitle} moods={realData.moods} />;
    }

    case "real_teaser": {
      if (!realData || realData.type !== "real_teaser") return <RealDataUnavailable />;
      if (config.mode === "businesses") {
        return (
          <StaysTeaser
            title={config.title}
            eyebrow={config.eyebrow}
            items={realData.items}
            total={realData.total}
            seeAllHref={config.seeAllHref}
          />
        );
      }
      return <EventsTeaser title={config.title} eyebrow={config.eyebrow} items={realData.items} seeAllHref={config.seeAllHref} />;
    }

    case "towns_row": {
      if (!realData || realData.type !== "towns_row") return <RealDataUnavailable />;
      return <TownsRow towns={realData.towns} title={config.title} />;
    }

    case "listing_explorer": {
      if (!realData || realData.type !== "listing_explorer") return <RealDataUnavailable />;
      const basePath = `/${pageSlug ?? config.rootSlug ?? ""}`;
      if (realData.kind === "events") {
        return (
          <EventsExplorer
            result={realData.result}
            searchParams={realData.searchParams}
            basePath={basePath}
            extras={{ submitHref: realData.submitHref, carnival: realData.carnival }}
          />
        );
      }
      return (
        <ListingExplorer
          config={{
            kind: realData.kind as "accommodation" | "things" | "food",
            basePath,
            title: config.title || pageTitle || "Somerset",
            intro: config.intro,
            noun: config.noun || "places",
            crumbs: [
              { label: "Home", href: "/" },
              ...(config.parentLabel ? [{ label: config.parentLabel as string, href: config.parentHref as string | undefined }] : []),
              { label: config.title || pageTitle || "Somerset" },
            ],
          }}
          result={realData.result}
          searchParams={realData.searchParams}
        />
      );
    }

    case "map_band": {
      if (!realData || realData.type !== "map_band") return <RealDataUnavailable />;
      return (
        <MapBand
          eyebrow={config.eyebrow}
          heading={config.heading}
          text={config.text}
          primary={{ label: config.primaryLabel, url: config.primaryUrl }}
          secondary={{ label: config.secondaryLabel, url: config.secondaryUrl }}
          pins={realData.pins}
        />
      );
    }

    case "partners_row": {
      if (!realData || realData.type !== "partners_row") return <RealDataUnavailable />;
      return (
        <PartnersRow
          eyebrow={config.eyebrow}
          title={config.title}
          items={realData.items}
          seeAllLabel={config.seeAllLabel}
          seeAllHref={config.seeAllHref}
        />
      );
    }

    case "content_panel":
      return <ContentPanel config={config} />;

    case "button":
      return <ButtonWidget label={config.label} url={config.url} style={config.style} align={config.align} />;

    case "newsletter_bar":
      return <NewsletterBar heading={config.heading} text={config.text} />;

    case "spotlight":
      return (
        <Spotlight
          eyebrow={config.eyebrow}
          heading={config.heading}
          text={config.text}
          imageUrl={config.imageUrl}
          ctaLabel={config.ctaLabel}
          ctaUrl={config.ctaUrl}
        />
      );

    case "ad_bar":
      return <AdBar imageUrl={config.imageUrl} url={config.url} alt={config.alt} label={config.label} />;

    case "availability_search":
      return <AvailabilitySearch title={config.title} text={config.text} />;

    case "event_form":
      return <EventFormWidget heading={config.heading} intro={config.intro} pageId={pageId} />;

    case "embed":
      return <EmbedWidget heading={config.heading} url={config.url} height={config.height} linkLabel={config.linkLabel} />;

    case "social_panel":
      return <SocialPanel heading={config.heading} handle={config.handle} profileUrl={config.profileUrl} images={config.images} />;

    case "contact_form":
      return <ContactFormWidget heading={config.heading} intro={config.intro} pageId={pageId} pageTitle={pageTitle} />;

    case "page_cards": {
      if (!realData || realData.type !== "page_cards") return <RealDataUnavailable />;
      return <PageCards title={config.title} cards={realData.cards} />;
    }

    case "buy_panel": {
      if (!realData || realData.type !== "buy_panel") return <RealDataUnavailable />;
      return <BuyPanel heading={config.heading} limit={Number(config.limit) || 4} producer={realData.producer} />;
    }

    case "producer_shop": {
      if (!realData || realData.type !== "producer_shop") return <RealDataUnavailable />;
      return <ProducerShop intro={config.intro} producers={realData.producers} />;
    }

    case "experiences_hub": {
      if (!realData || realData.type !== "experiences_hub") return <RealDataUnavailable />;
      return (
        <ExperiencesHubView
          hub={realData.hub}
          searchParams={realData.searchParams}
          basePath={`/${pageSlug ?? "book-experiences"}`}
          heading={config.heading}
          intro={config.intro}
        />
      );
    }

    default:
      return <div className="p-6 text-sm text-neutral-400">Unknown section type: {type}</div>;
  }
}
