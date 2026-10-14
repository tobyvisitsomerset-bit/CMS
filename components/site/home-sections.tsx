import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { TripHeart } from "@/components/trip/trip-heart";
import { parsePrice } from "@/lib/data/listing-explorer";
import type { ExploreAreaTile, FeaturedPageTile, TownTile } from "@/lib/data/pages";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">{children}</p>;
}

function dateLabel(start: string | null | undefined, end: string | null | undefined) {
  if (!start) return "";
  const s = new Date(start);
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", o);
  if (!end || end.slice(0, 10) === start.slice(0, 10)) return fmt(s, { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
  const e = new Date(end);
  return `${fmt(s, { day: "numeric", month: "short" })} – ${fmt(e, { day: "numeric", month: "short" })}`.toUpperCase();
}

// "Somerset by mood" — circular photo tiles. Each tile is a real keyword
// search over real business pages and shows its real result count.
export function MoodTiles({
  eyebrow,
  title,
  subtitle,
  moods,
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  moods: { label: string; query: string; count: number }[];
}) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-7xl">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="mt-1 font-serif text-3xl font-black text-stone-900 sm:text-4xl">{title || "Somerset by mood"}</h2>
        {subtitle && <p className="mt-1 text-stone-600">{subtitle}</p>}
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {moods.map((m) => (
            <Link key={m.label} href={`/search?q=${encodeURIComponent(m.query)}&places=1`} className="group flex flex-col items-center text-center">
              <Img
                src={null}
                alt=""
                label={m.label}
                className="aspect-square w-full max-w-44 rounded-full transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <p className="mt-3 font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{m.label}</p>
              <p className="text-xs text-stone-500">
                {m.count.toLocaleString("en-GB")} {m.count === 1 ? "place" : "places"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const EVENT_CHIPS = [
  { label: "This week", href: "/festivals-events?when=week" },
  { label: "Weekend", href: "/festivals-events?when=weekend" },
  { label: "Free", href: "/festivals-events?free=1" },
  { label: "Family", href: "/festivals-events?q=family" },
];

// "On this week" — real upcoming events in date order on a cool-grey band.
export function EventsTeaser({
  title,
  eyebrow,
  items,
  seeAllHref,
}: {
  title?: string;
  eyebrow?: string;
  items: FeaturedPageTile[];
  seeAllHref?: string;
}) {
  const monthYear = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }).toUpperCase();
  return (
    <section className="bg-cool-grey px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{eyebrow || monthYear}</Eyebrow>
            <h2 className="mt-1 font-serif text-3xl font-black text-stone-900 sm:text-4xl">{title || "On this week"}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {EVENT_CHIPS.map((c) => (
              <Link
                key={c.label}
                href={c.href}
                className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-medium text-stone-700 hover:border-somerset-green hover:text-somerset-green"
              >
                {c.label}
              </Link>
            ))}
            <Link href={seeAllHref || "/festivals-events"} className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-sm font-bold text-stone-900 hover:border-somerset-green">
              All events →
            </Link>
          </div>
        </div>
        {items.length === 0 ? (
          <p className="mt-8 rounded-3xl bg-white p-8 text-center text-stone-500">No upcoming events are listed right now — check back soon.</p>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {items.map((e) => (
              <article key={e.id} className="relative grid grid-cols-[42%_1fr] overflow-hidden rounded-3xl bg-white shadow-sm">
                <Link href={`/${e.slug}`} tabIndex={-1} aria-hidden>
                  <Img src={e.heroImageUrl} alt="" label={e.title} className="h-full min-h-44 w-full" />
                </Link>
                <div className="flex flex-col gap-1.5 p-5">
                  <p className="text-[11px] font-semibold tracking-wider text-stone-500">{dateLabel(e.startDate, e.endDate)}</p>
                  <h3 className="font-serif text-xl leading-snug font-black text-stone-900">
                    <Link href={`/${e.slug}`} className="hover:text-somerset-green">
                      {e.title}
                    </Link>
                  </h3>
                  <p className="line-clamp-1 text-sm text-stone-500">{[e.town, e.admission].filter(Boolean).join(" · ")}</p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <Link href={`/${e.slug}`} className="text-sm font-bold text-somerset-green hover:underline">
                      View details →
                    </Link>
                    <TripHeart id={e.id} title={e.title} slug={e.slug} heroImageUrl={e.heroImageUrl} className="border border-stone-200 shadow-none" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// "Somewhere to stay" — real accommodation, highest membership tiers first.
export function StaysTeaser({
  title,
  eyebrow,
  items,
  total,
  seeAllHref,
}: {
  title?: string;
  eyebrow?: string;
  items: FeaturedPageTile[];
  total: number;
  seeAllHref?: string;
}) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>{eyebrow || "Where to stay"}</Eyebrow>
            <h2 className="mt-1 font-serif text-3xl font-black text-stone-900 sm:text-4xl">{title || "Somewhere to stay"}</h2>
          </div>
          <Link href={seeAllHref || "/places-to-stay"} className="text-sm font-bold text-somerset-green hover:underline">
            All {total > 0 ? `${total.toLocaleString("en-GB")} ` : ""}places to stay →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => {
            const price = parsePrice(s.admission ?? null);
            return (
              <article key={s.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white">
                <div className="relative">
                  <Link href={`/${s.slug}`} tabIndex={-1} aria-hidden>
                    <Img src={s.heroImageUrl} alt="" label={s.title} className="aspect-[16/10] w-full" />
                  </Link>
                  <TripHeart id={s.id} title={s.title} slug={s.slug} heroImageUrl={s.heroImageUrl} className="absolute left-3 top-3" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-serif text-xl leading-tight font-black text-stone-900">
                    <Link href={`/${s.slug}`} className="hover:text-somerset-green">
                      {s.title}
                    </Link>
                  </h3>
                  <p className="line-clamp-1 text-sm text-stone-500">{[s.town, s.subtitle].filter(Boolean).join(" · ")}</p>
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                    {price.from ? (
                      <p className="font-serif text-xl font-black text-stone-900">
                        <span className="mr-1 font-sans text-xs font-medium text-stone-500">from</span>£{price.from}
                        {price.unit && <span className="ml-1 font-sans text-xs font-medium text-stone-500">{price.unit}</span>}
                      </p>
                    ) : (
                      <span />
                    )}
                    <div className="flex gap-2">
                      <Link href={`/${s.slug}`} className="rounded-full border border-stone-300 px-3.5 py-2 text-sm font-bold text-stone-800 hover:border-somerset-green">
                        View details
                      </Link>
                      <Link href={`/${s.slug}#enquire`} className="rounded-full bg-damson px-3.5 py-2 text-sm font-bold text-white hover:opacity-90">
                        Check dates
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TownsRow({ towns, title }: { towns: TownTile[]; title?: string }) {
  return (
    <section className="px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <Eyebrow>Towns &amp; cities</Eyebrow>
        <h2 className="mt-1 font-serif text-3xl font-black text-stone-900 sm:text-4xl">{title || "Find your Somerset"}</h2>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {towns.map((town) => (
            <Link key={town.id} href={`/${town.slug}`} className="group">
              <div className="overflow-hidden rounded-3xl">
                <Img src={town.heroImageUrl} alt="" label={town.title} className="aspect-[4/5] w-full transition-transform duration-300 group-hover:scale-105" />
              </div>
              <p className="mt-3 font-serif text-lg font-black text-stone-900 group-hover:text-somerset-green">{town.title}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AreaTiles({ tiles, title }: { tiles: ExploreAreaTile[]; title?: string }) {
  return (
    <section className="bg-cool-grey px-6 py-14">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-serif text-3xl font-black text-stone-900 sm:text-4xl">{title || "Explore Somerset"}</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex flex-col justify-between rounded-3xl bg-white p-5 transition-shadow hover:shadow-md"
            >
              <p className="font-serif text-xl font-black text-stone-900">{tile.label}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-stone-500">
                <span>{tile.description}</span>
                <ArrowRight className="size-4 shrink-0 text-somerset-green transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
