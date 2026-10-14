import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { TripHeart } from "@/components/trip/trip-heart";
import type { ExperiencesHub } from "@/lib/data/experiences";
import { buildHref, Pagination } from "./listing-explorer";

type SP = Record<string, string | undefined>;

// Book Experiences landing page — see lib/data/experiences.ts for what is
// (and deliberately is not) real here.
export function ExperiencesHubView({
  hub,
  searchParams,
  basePath,
  heading,
  intro,
}: {
  hub: ExperiencesHub;
  searchParams: SP;
  basePath: string;
  heading?: string;
  intro?: string;
}) {
  const sp = searchParams;
  const { result, stats, kinds, towns } = hub;

  return (
    <div>
      <section className="relative isolate bg-white">
        <div className="relative isolate overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green text-white">
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-deep-green/40 to-deep-green/70" />
          <div className="mx-auto max-w-4xl px-6 pt-16 pb-40 text-center sm:pt-24">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-white/80 uppercase">Book direct · No commission</p>
            <h1 className="mt-4 font-serif text-5xl leading-none font-black tracking-tight sm:text-7xl">{heading || "Book experiences"}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/90">
              {intro ||
                `Tours, tastings, caves, steam trains and boat trips — ${stats.count.toLocaleString("en-GB")} things you can book right now, straight with the people running them.`}
            </p>
          </div>
        </div>
        <form action={basePath} method="GET" className="relative z-10 mx-auto -mt-28 max-w-5xl rounded-[2rem] bg-white p-4 shadow-2xl sm:p-5">
          <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
            <label className="rounded-2xl border border-stone-200 px-4 py-2.5">
              <span className="block text-[11px] font-medium text-stone-500">What</span>
              <input name="q" defaultValue={sp.q ?? ""} placeholder="Anything" className="w-full bg-transparent text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none" />
            </label>
            <label className="rounded-2xl border border-stone-200 px-4 py-2.5">
              <span className="block text-[11px] font-medium text-stone-500">Where</span>
              <select name="town" defaultValue={sp.town ?? ""} className="w-full bg-transparent text-sm font-semibold text-stone-900 focus:outline-none">
                <option value="">Anywhere in Somerset</option>
                {towns.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.count})
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-full bg-somerset-green px-7 py-3 text-sm font-bold text-white hover:opacity-90">
              Search experiences
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {kinds.map((k) => (
              <Link
                key={k.q}
                href={buildHref(basePath, sp, { q: sp.q === k.q ? undefined : k.q })}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${sp.q === k.q ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green"}`}
              >
                {k.label}
              </Link>
            ))}
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-12 pb-6">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">Book direct with the operator</p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-3xl font-black text-stone-900 sm:text-4xl">Bookable now</h2>
          <p className="text-sm text-stone-500">
            {result.matched.toLocaleString("en-GB")} {result.matched === 1 ? "experience" : "experiences"}
            {(sp.q || sp.town) && (
              <>
                {" · "}
                <Link href={basePath} className="font-semibold text-somerset-green hover:underline">
                  Clear filters
                </Link>
              </>
            )}
          </p>
        </div>

        {result.matched === 0 ? (
          <p className="mt-6 rounded-3xl bg-cool-grey p-10 text-center text-stone-600">Nothing matches that search — try another word or place.</p>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...(result.featured ? [result.featured] : []), ...result.items].map((item) => (
              <article key={item.id} className="relative flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white">
                <div className="relative">
                  <Link href={`/${item.slug}`} tabIndex={-1} aria-hidden>
                    <Img src={item.heroImageUrl} alt="" label={item.title} className="aspect-[16/10] w-full" />
                  </Link>
                  <TripHeart id={item.id} title={item.title} slug={item.slug} heroImageUrl={item.heroImageUrl} className="absolute right-3 top-3" />
                  {item.tier && (item.tier === "GOLD" || item.tier === "PLATINUM") && (
                    <span className="absolute left-3 top-3 rounded-full bg-damson px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">Featured member</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                    {[item.type, item.town].filter(Boolean).join(" · ")}
                  </p>
                  <h3 className="font-serif text-xl leading-tight font-black text-stone-900">
                    <Link href={`/${item.slug}`} className="hover:text-somerset-green">
                      {item.title}
                    </Link>
                  </h3>
                  {item.summary && <p className="line-clamp-2 text-sm text-stone-600">{item.summary}</p>}
                  <div className="mt-auto flex items-end justify-between gap-3 pt-3">
                    {item.priceFrom ? (
                      <p className="font-serif text-xl font-black text-stone-900">
                        <span className="mr-1 font-sans text-xs font-medium text-stone-500">from</span>£{item.priceFrom}
                        {item.priceUnit && <span className="ml-1 font-sans text-xs font-medium text-stone-500">{item.priceUnit}</span>}
                      </p>
                    ) : (
                      <span />
                    )}
                    <a
                      href={item.bookingUrl ?? `/${item.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-damson px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                    >
                      {item.bookingLabel && item.bookingLabel !== "Book Now" ? item.bookingLabel : "Check dates"} <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination basePath={basePath} sp={sp} page={result.page} pageCount={result.pageCount} />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-stone-200 p-6">
            <p className="font-serif text-4xl font-black text-stone-900">{stats.count.toLocaleString("en-GB")}</p>
            <p className="mt-1 text-sm text-stone-500">experiences you can book direct</p>
          </div>
          <div className="rounded-3xl border border-stone-200 p-6">
            <p className="font-serif text-4xl font-black text-stone-900">0%</p>
            <p className="mt-1 text-sm text-stone-500">commission — you book on the operator&apos;s own site</p>
          </div>
          {stats.avgPrice !== null && (
            <div className="rounded-3xl bg-cool-grey p-6">
              <p className="font-serif text-4xl font-black text-stone-900">£{Math.round(stats.avgPrice)}</p>
              <p className="mt-1 text-sm text-stone-500">average &ldquo;from&rdquo; price across {stats.priced} priced listings</p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="font-serif text-3xl font-black text-stone-900 sm:text-4xl">By the kind of day you want</h2>
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {kinds.map((k) => (
            <Link key={k.q} href={buildHref(basePath, {}, { q: k.q })} className="group flex flex-col items-center text-center">
              <Img src={null} alt="" label={k.label} className="aspect-square w-full max-w-40 rounded-full transition-transform duration-300 group-hover:scale-[1.03]" />
              <p className="mt-3 font-serif text-base leading-tight font-black text-stone-900 group-hover:text-somerset-green">{k.label}</p>
              <p className="text-xs text-stone-500">{k.count} bookable</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 rounded-[2rem] bg-cool-grey px-8 py-10">
          <div>
            <h2 className="font-serif text-2xl font-black text-stone-900">Run something bookable?</h2>
            <p className="mt-1 max-w-xl text-stone-600">Members list their tours, tastings and trips with a booking link — you keep every penny of the ticket price.</p>
          </div>
          <Link href="/business" className="rounded-full bg-somerset-green px-6 py-3 text-sm font-bold text-white hover:opacity-90">
            Business in Somerset
          </Link>
        </div>
      </section>
    </div>
  );
}
