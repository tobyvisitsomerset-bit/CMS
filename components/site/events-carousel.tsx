"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { FeaturedPageTile } from "@/lib/data/pages";

function dateRange(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return "";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).toUpperCase();
  const s = fmt(start);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return s;
  return `${s} - ${fmt(end)}`;
}

// Upcoming events as a row of cards that scrolls sideways, as on the current
// site. The row is a normal scrolling region (keyboard and touch work) and the
// two buttons move it a page at a time.
export function EventsCarousel({ title, items, seeAllHref }: { title?: string; items: FeaturedPageTile[]; seeAllHref?: string }) {
  const row = useRef<HTMLDivElement>(null);

  function move(direction: 1 | -1) {
    const el = row.current;
    if (!el) return;
    const calm =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.getAttribute("data-a11y-motion") === "stop";
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: calm ? "auto" : "smooth" });
  }

  const arrow =
    "flex size-11 items-center justify-center bg-damson text-white transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900";

  return (
    <section className="px-6 py-14" aria-labelledby="events-carousel-heading">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-end justify-between gap-4">
          <h2 id="events-carousel-heading" className="font-script text-4xl leading-none text-somerset-green sm:text-5xl">
            {title || "Upcoming events"}
          </h2>
          {items.length > 3 && (
            <div className="flex gap-2">
              <button type="button" className={arrow} onClick={() => move(-1)} aria-label="Earlier events">
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button type="button" className={arrow} onClick={() => move(1)} aria-label="Later events">
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {items.length === 0 ? (
          <p className="mt-8 bg-cool-grey p-8 text-center text-stone-700">No upcoming events are listed right now. Check back soon.</p>
        ) : (
          <div
            ref={row}
            role="region"
            aria-label="Upcoming events"
            tabIndex={0}
            className="mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-6 [scrollbar-width:thin]"
          >
            {items.map((e) => (
              <article
                key={e.id}
                className="relative flex w-[85%] shrink-0 snap-start flex-col overflow-hidden bg-white shadow-md sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <Link href={`/${e.slug}`} tabIndex={-1} aria-hidden="true">
                  <div className="aspect-[16/10] [clip-path:polygon(0_0,100%_0,100%_92%,0_100%)]">
                    <Img src={e.heroImageUrl} alt="" label={e.title} className="h-full w-full" />
                  </div>
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-6 pb-14">
                  <p className="text-sm font-semibold text-damson">{dateRange(e.startDate, e.endDate)}</p>
                  <h3 className="text-2xl leading-snug font-medium text-somerset-green">
                    <Link href={`/${e.slug}`} className="hover:underline">
                      {e.title}
                    </Link>
                  </h3>
                  {e.summary && <p className="line-clamp-3 text-stone-700">{e.summary}</p>}
                  <Link href={`/${e.slug}`} className="mt-auto inline-flex items-center gap-1 pt-3 font-bold text-damson hover:underline">
                    Read more
                    <span className="sr-only"> about {e.title}</span>
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
                <span aria-hidden="true" className="absolute right-0 bottom-0 size-10 bg-somerset-green/30 [clip-path:polygon(100%_0,100%_100%,0_100%)]" />
              </article>
            ))}
          </div>
        )}

        <p className="mt-2 text-center">
          <Link href={seeAllHref || "/festivals-events"} className="font-bold text-somerset-green underline hover:text-deep-green">
            See all events
          </Link>
        </p>
      </div>
    </section>
  );
}
