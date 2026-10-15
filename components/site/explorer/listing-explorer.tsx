import Link from "next/link";
import { ChevronRight, MapPin, Search } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { TripHeart } from "@/components/trip/trip-heart";
import { cn } from "@/lib/utils";
import type { ExplorerItem, ExplorerResult } from "@/lib/data/listing-explorer";
import { ExplorerMap } from "./explorer-map";
import { LEVEL_LABEL } from "@/lib/membership";
import { ACCESS_FEATURES } from "@/lib/accessibility";

export type ExplorerConfig = {
  kind: "accommodation" | "things" | "food";
  basePath: string; // e.g. /places-to-stay
  title: string;
  intro?: string;
  crumbs: { label: string; href?: string }[];
  /** Noun for counts, e.g. "places to stay". */
  noun: string;
};

type SP = Record<string, string | undefined>;

export function buildHref(basePath: string, current: SP, overrides: SP): string {
  const next: SP = { ...current, ...overrides };
  // Any filter change resets pagination unless page was explicitly set.
  if (!("page" in overrides)) delete next.page;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `${basePath}?${s}` : basePath;
}

function Chip({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-somerset-green bg-somerset-green text-white"
          : "border-stone-200 bg-white text-stone-700 hover:border-somerset-green hover:text-somerset-green",
      )}
    >
      {children}
    </Link>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: ExplorerConfig["crumbs"] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3" />}
          {c.href ? (
            <Link href={c.href} className="hover:text-somerset-green hover:underline">
              {c.label}
            </Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

function priceLine(item: ExplorerItem) {
  if (!item.priceFrom) return null;
  return {
    amount: `£${Number.isInteger(item.priceFrom) ? item.priceFrom : item.priceFrom.toFixed(2)}`,
    unit: item.priceUnit,
  };
}

function detailHref(item: ExplorerItem, sp: SP, hash?: string) {
  const carry = new URLSearchParams();
  for (const k of ["checkin", "checkout", "guests"]) if (sp[k]) carry.set(k, sp[k]!);
  const qs = carry.toString();
  return `/${item.slug}${qs ? `?${qs}` : ""}${hash ?? ""}`;
}

function ListCard({ item, sp, featured, kind }: { item: ExplorerItem; sp: SP; featured?: boolean; kind: ExplorerConfig["kind"] }) {
  const price = priceLine(item);
  const sub = [item.type, item.town].filter(Boolean).join(" · ");
  return (
    <article
      className={cn(
        "relative grid overflow-hidden rounded-3xl border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:grid-cols-[15rem_1fr]",
        featured ? "border-damson/40" : "border-stone-200",
      )}
    >
      <div className="relative">
        <Link href={detailHref(item, sp)} tabIndex={-1} aria-hidden>
          <Img src={item.heroImageUrl} alt="" label={item.title} className="h-48 w-full sm:h-full sm:min-h-[12rem]" />
        </Link>
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-damson px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
            Featured member
          </span>
        )}
        <TripHeart id={item.id} title={item.title} slug={item.slug} heroImageUrl={item.heroImageUrl} className="absolute right-3 top-3 sm:hidden" />
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-xl leading-tight font-black text-stone-900">
              <Link href={detailHref(item, sp)} className="hover:text-somerset-green">
                {item.title}
              </Link>
            </h3>
            {sub && <p className="mt-0.5 text-sm text-stone-500">{sub}</p>}
          </div>
          <TripHeart id={item.id} title={item.title} slug={item.slug} heroImageUrl={item.heroImageUrl} className="hidden shrink-0 border border-stone-200 shadow-none sm:flex" />
        </div>
        {(item.summary || item.subtitle) && <p className="line-clamp-2 text-sm text-stone-600">{item.summary || item.subtitle}</p>}
        <div className="flex flex-wrap gap-1.5">
          {item.grading && <span className="rounded-full bg-cool-grey px-2.5 py-1 text-xs text-stone-700">{item.grading}</span>}
          {item.hasBooking && <span className="rounded-full bg-damson/10 px-2.5 py-1 text-xs font-medium text-damson">Book online</span>}
          {item.tier && <span className="rounded-full bg-cool-grey px-2.5 py-1 text-xs text-stone-700">{LEVEL_LABEL[item.tier]} member</span>}
          {item.access.slice(0, 3).map((k) => (
            <span key={k} className="rounded-full bg-somerset-green/10 px-2.5 py-1 text-xs font-medium text-somerset-green">
              {ACCESS_FEATURES.find((f) => f.key === k)?.short ?? k}
            </span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-1">
          <div>
            {price ? (
              <p className="font-serif text-xl font-black text-stone-900">
                <span className="mr-1 text-xs font-sans font-medium text-stone-500">from</span>
                {price.amount}
                {price.unit && <span className="ml-1 text-xs font-sans font-medium text-stone-500">{price.unit}</span>}
              </p>
            ) : (
              <p className="text-xs text-stone-400">{kind === "accommodation" ? "Contact for prices" : ""}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href={detailHref(item, sp)}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-800 transition-colors hover:border-somerset-green hover:text-somerset-green"
            >
              View details
            </Link>
            {kind === "accommodation" && (
              <Link
                href={detailHref(item, sp, "#enquire")}
                className="rounded-full bg-damson px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Check availability
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function GridCard({ item, sp, featured }: { item: ExplorerItem; sp: SP; featured?: boolean }) {
  const price = priceLine(item);
  return (
    <article className={cn("relative flex flex-col overflow-hidden rounded-3xl border bg-white", featured ? "border-damson/40" : "border-stone-200")}>
      <div className="relative">
        <Link href={detailHref(item, sp)} tabIndex={-1} aria-hidden>
          <Img src={item.heroImageUrl} alt="" label={item.title} className="aspect-[4/3] w-full" />
        </Link>
        {featured && (
          <span className="absolute left-3 top-3 rounded-full bg-damson px-3 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
            Featured member
          </span>
        )}
        <TripHeart id={item.id} title={item.title} slug={item.slug} heroImageUrl={item.heroImageUrl} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {item.type && <p className="text-[11px] font-semibold tracking-wider text-somerset-green uppercase">{item.type}</p>}
        <h3 className="font-serif text-lg leading-tight font-black text-stone-900">
          <Link href={detailHref(item, sp)} className="hover:text-somerset-green">
            {item.title}
          </Link>
        </h3>
        <p className="text-sm text-stone-500">{[item.town, price ? `from ${price.amount}` : null].filter(Boolean).join(" · ")}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {item.grading && <span className="rounded-full bg-cool-grey px-2.5 py-1 text-xs text-stone-700">{item.grading}</span>}
          {item.hasBooking && <span className="rounded-full bg-damson/10 px-2.5 py-1 text-xs font-medium text-damson">Book online</span>}
        </div>
        <Link
          href={detailHref(item, sp)}
          className="mt-auto inline-block self-start rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-800 transition-colors hover:border-somerset-green hover:text-somerset-green"
        >
          View details
        </Link>
      </div>
    </article>
  );
}

export function Pagination({ basePath, sp, page, pageCount }: { basePath: string; sp: SP; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const nums = new Set<number>([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...nums].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const parts: (number | "gap")[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) parts.push("gap");
    parts.push(n);
  });
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-wrap items-center justify-center gap-2">
      {parts.map((p, i) =>
        p === "gap" ? (
          <span key={`g${i}`} className="px-1 text-stone-400">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(basePath, sp, { page: String(p) })}
            scroll
            className={cn(
              "flex size-10 items-center justify-center rounded-full border text-sm font-semibold",
              p === page ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 bg-white text-stone-700 hover:border-somerset-green",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount && (
        <Link
          href={buildHref(basePath, sp, { page: String(page + 1) })}
          className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-somerset-green"
        >
          Next →
        </Link>
      )}
    </nav>
  );
}

export function ListingExplorer({
  config,
  result,
  searchParams,
}: {
  config: ExplorerConfig;
  result: ExplorerResult;
  searchParams: SP;
}) {
  const sp = searchParams;
  const { kind, basePath } = config;
  const view = sp.view === "map" ? "map" : sp.view === "list" ? "list" : kind === "accommodation" ? "list" : "grid";
  const sort = sp.sort ?? "recommended";
  const hasDates = !!(sp.checkin || sp.checkout || sp.guests);
  const filtersActive = !!(sp.q || sp.type || sp.town || sp.graded || sp.bookable || sp.featured || sp.access);

  const sortOptions = [
    { key: "recommended", label: "Recommended" },
    ...(kind === "accommodation" ? [{ key: "price", label: "Price" }] : []),
    { key: "name", label: "A–Z" },
  ];

  const list = (
    <div className="space-y-4">
      {result.featured && <ListCard item={result.featured} sp={sp} featured kind={kind} />}
      {result.items.map((item) => (
        <ListCard key={item.id} item={item} sp={sp} kind={kind} />
      ))}
    </div>
  );

  const grid = (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {result.featured && <GridCard item={result.featured} sp={sp} featured />}
      {result.items.map((item) => (
        <GridCard key={item.id} item={item} sp={sp} />
      ))}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <Breadcrumbs crumbs={config.crumbs} />
      <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-stone-900 sm:text-5xl">{config.title}</h1>
      <p className="mt-2 max-w-3xl text-stone-600">
        {config.intro ? `${config.intro} ` : ""}
        {result.total.toLocaleString("en-GB")} {config.noun} across Somerset.
      </p>

      {/* Search panel */}
      <form action={basePath} method="GET" className="mt-6 rounded-3xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
        <div className={cn("grid gap-3", kind === "accommodation" ? "md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]" : "md:grid-cols-[1fr_auto]")}>
          <label className="rounded-2xl border border-stone-200 px-4 py-2">
            <span className="block text-[11px] font-medium text-stone-500">Where</span>
            <input
              type="text"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Anywhere in Somerset"
              className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
            />
          </label>
          {kind === "accommodation" && (
            <>
              <label className="rounded-2xl border border-stone-200 px-4 py-2">
                <span className="block text-[11px] font-medium text-stone-500">Check in</span>
                <input type="date" name="checkin" defaultValue={sp.checkin ?? ""} className="w-full bg-transparent text-sm font-medium text-stone-900 focus:outline-none" />
              </label>
              <label className="rounded-2xl border border-stone-200 px-4 py-2">
                <span className="block text-[11px] font-medium text-stone-500">Check out</span>
                <input type="date" name="checkout" defaultValue={sp.checkout ?? ""} className="w-full bg-transparent text-sm font-medium text-stone-900 focus:outline-none" />
              </label>
              <label className="rounded-2xl border border-stone-200 px-4 py-2">
                <span className="block text-[11px] font-medium text-stone-500">Guests</span>
                <input
                  type="text"
                  name="guests"
                  defaultValue={sp.guests ?? ""}
                  placeholder="2 adults"
                  className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none"
                />
              </label>
            </>
          )}
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-somerset-green px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            <Search className="size-4" />
            Search
          </button>
        </div>
        {kind === "accommodation" && (
          <p className="mt-2 px-1 text-xs text-stone-500">
            Dates and guests travel with you to each listing&apos;s enquiry form — availability is confirmed by the business.
          </p>
        )}
      </form>

      {/* Chips */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Chip href={buildHref(basePath, sp, { type: undefined, graded: undefined, bookable: undefined, featured: undefined, town: undefined })} active={!filtersActive || (!sp.type && !sp.graded && !sp.bookable && !sp.featured && !sp.town)}>
          All
        </Chip>
        {result.types.slice(0, 9).map((t) => (
          <Chip key={t.slug} href={buildHref(basePath, sp, { type: sp.type === t.slug ? undefined : t.slug })} active={sp.type === t.slug}>
            {t.label} <span className="opacity-60">· {t.count}</span>
          </Chip>
        ))}
        {result.counts.graded > 0 && (
          <Chip href={buildHref(basePath, sp, { graded: sp.graded ? undefined : "1" })} active={!!sp.graded}>
            Quality graded
          </Chip>
        )}
        {result.counts.bookable > 0 && (
          <Chip href={buildHref(basePath, sp, { bookable: sp.bookable ? undefined : "1" })} active={!!sp.bookable}>
            Book online
          </Chip>
        )}
        {result.counts.featured > 0 && (
          <Chip href={buildHref(basePath, sp, { featured: sp.featured ? undefined : "1" })} active={!!sp.featured}>
            Featured members
          </Chip>
        )}
      </div>
      {ACCESS_FEATURES.some((f) => (result.accessCounts?.[f.key] ?? 0) > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-stone-400 uppercase">Accessible</span>
          {ACCESS_FEATURES.filter((f) => (result.accessCounts?.[f.key] ?? 0) > 0).map((f) => {
            const active = (sp.access ?? "").split(",").includes(f.key);
            const next = active
              ? (sp.access ?? "").split(",").filter((k) => k && k !== f.key)
              : [...(sp.access ?? "").split(",").filter(Boolean), f.key];
            return (
              <Chip key={f.key} href={buildHref(basePath, sp, { access: next.join(",") || undefined })} active={active}>
                {f.short} <span className="opacity-60">· {result.accessCounts[f.key]}</span>
              </Chip>
            );
          })}
        </div>
      )}
      {result.towns.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-stone-400 uppercase">Near</span>
          {result.towns.slice(0, 8).map((t) => (
            <Chip key={t.name} href={buildHref(basePath, sp, { town: sp.town === t.name ? undefined : t.name })} active={sp.town === t.name}>
              {t.name}
            </Chip>
          ))}
        </div>
      )}

      {hasDates && (
        <p className="mt-4 rounded-2xl bg-cool-grey px-4 py-2.5 text-sm text-stone-700">
          Your stay:{" "}
          <strong>
            {[sp.checkin && sp.checkout ? `${sp.checkin} → ${sp.checkout}` : sp.checkin || sp.checkout, sp.guests].filter(Boolean).join(" · ")}
          </strong>{" "}
          — we&apos;ll pass this on when you enquire.
        </p>
      )}

      {/* Results bar */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <p className="text-sm text-stone-600">
          <strong className="text-stone-900">{result.matched.toLocaleString("en-GB")}</strong>{" "}
          {result.matched === 1 ? "place" : "places"}
          {filtersActive && (
            <>
              {" · "}
              <Link href={basePath} className="font-medium text-somerset-green hover:underline">
                Clear filters
              </Link>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm">
            <span className="text-stone-500">Sort</span>
            {sortOptions.map((o) => (
              <Chip key={o.key} href={buildHref(basePath, sp, { sort: o.key === "recommended" ? undefined : o.key })} active={sort === o.key}>
                {o.label}
              </Chip>
            ))}
          </div>
          {kind !== "accommodation" && (
            <div className="flex overflow-hidden rounded-full border border-stone-200 text-sm font-semibold">
              {(["grid", "list", "map"] as const).map((v) => (
                <Link
                  key={v}
                  href={buildHref(basePath, sp, { view: v === "grid" ? undefined : v })}
                  className={cn("px-3.5 py-1.5 capitalize", view === v ? "bg-somerset-green text-white" : "text-stone-700 hover:bg-cool-grey")}
                >
                  {v}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {result.matched === 0 ? (
        <div className="mt-8 rounded-3xl bg-cool-grey p-10 text-center">
          <p className="font-serif text-xl font-black text-stone-900">Nothing matches those filters</p>
          <p className="mt-1 text-sm text-stone-600">Try removing a filter or searching somewhere else in Somerset.</p>
          <Link href={basePath} className="mt-4 inline-block rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white">
            Clear filters
          </Link>
        </div>
      ) : kind === "accommodation" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_26rem]">
          <div>
            {view === "map" ? <div className="h-[34rem]"><ExplorerMap pins={result.mapPins} /></div> : list}
            <Pagination basePath={basePath} sp={sp} page={result.page} pageCount={result.pageCount} />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-32 h-[34rem]">
              <ExplorerMap pins={result.mapPins} />
              <Link
                href="/interactive-map"
                className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-stone-800 shadow"
              >
                <MapPin className="size-3.5" />
                Full screen
              </Link>
            </div>
          </aside>
        </div>
      ) : (
        <div className="mt-6">
          {view === "map" ? <div className="h-[36rem]"><ExplorerMap pins={result.mapPins} /></div> : view === "list" ? list : grid}
          <Pagination basePath={basePath} sp={sp} page={result.page} pageCount={result.pageCount} />
        </div>
      )}
    </div>
  );
}
