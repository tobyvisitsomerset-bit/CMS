import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { TripHeart } from "@/components/trip/trip-heart";
import { cn } from "@/lib/utils";
import type { ExplorerItem, ExplorerResult } from "@/lib/data/listing-explorer";
import { buildHref } from "./listing-explorer";
import { ExplorerMap } from "./explorer-map";

type SP = Record<string, string | undefined>;

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

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

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

function fmtDay(key: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${key}T12:00:00`).toLocaleDateString("en-GB", opts);
}

function dateRange(item: ExplorerItem): string {
  if (!item.startDate) return "";
  const s = dayKey(item.startDate);
  const e = item.endDate ? dayKey(item.endDate) : s;
  if (s === e) return fmtDay(s, { weekday: "short", day: "numeric", month: "short" });
  return `${fmtDay(s, { day: "numeric", month: "short" })} – ${fmtDay(e, { day: "numeric", month: "short" })}`;
}

function MiniCalendar({
  monthKey,
  eventDays,
  selectedDay,
  basePath,
  sp,
  todayKey,
}: {
  monthKey: string;
  eventDays: Set<string>;
  selectedDay?: string;
  basePath: string;
  sp: SP;
  todayKey: string;
}) {
  const first = new Date(`${monthKey}-01T12:00:00`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // Monday first
  const prev = new Date(first.getFullYear(), first.getMonth() - 1, 1);
  const next = new Date(first.getFullYear(), first.getMonth() + 1, 1);
  const k = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const cells: (number | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="font-serif text-lg font-black text-stone-900">{first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <Link href={buildHref(basePath, sp, { month: k(prev), page: undefined })} aria-label="Previous month" className="rounded-full p-1.5 hover:bg-cool-grey">
            <ChevronLeft className="size-4" />
          </Link>
          <Link href={buildHref(basePath, sp, { month: k(next), page: undefined })} aria-label="Next month" className="rounded-full p-1.5 hover:bg-cool-grey">
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1 font-medium text-stone-400">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} />;
          const key = `${monthKey}-${String(day).padStart(2, "0")}`;
          const has = eventDays.has(key);
          const selected = selectedDay === key;
          const body = (
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-full text-sm",
                selected
                  ? "bg-somerset-green font-bold text-white"
                  : has
                    ? "bg-cool-grey font-semibold text-stone-900 hover:bg-somerset-green/15"
                    : "text-stone-300",
                key === todayKey && !selected && "ring-1 ring-somerset-green",
              )}
            >
              {day}
            </span>
          );
          return has ? (
            <Link key={key} href={buildHref(basePath, sp, { day: selected ? undefined : key, month: monthKey })} scroll={false} className="flex justify-center">
              {body}
            </Link>
          ) : (
            <span key={key} className="flex justify-center">
              {body}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-stone-500">Tinted days have events. Pick a day to filter the list.</p>
    </div>
  );
}

function EventRow({ item, sp, todayKey }: { item: ExplorerItem; sp: SP; todayKey: string }) {
  void sp;
  const startKey = item.startDate ? dayKey(item.startDate) : null;
  const ongoing = !!startKey && startKey < todayKey;
  const sub = [item.town, item.admission].filter(Boolean).join(" · ");
  return (
    <article className="grid gap-4 rounded-3xl border border-stone-200 bg-white p-4 sm:grid-cols-[4rem_5rem_1fr_auto] sm:items-center">
      <div className="hidden text-center sm:block">
        {startKey && !ongoing && (
          <>
            <p className="font-serif text-3xl leading-none font-black text-stone-900">{fmtDay(startKey, { day: "numeric" })}</p>
            <p className="mt-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">{fmtDay(startKey, { month: "short" })}</p>
          </>
        )}
        {ongoing && <p className="rounded-full bg-somerset-green/10 px-2 py-1 text-[11px] font-bold tracking-wider text-somerset-green uppercase">On now</p>}
      </div>
      <Link href={`/${item.slug}`} tabIndex={-1} aria-hidden className="hidden sm:block">
        <Img src={item.heroImageUrl} alt="" label="" className="h-16 w-20 rounded-2xl" />
      </Link>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-damson uppercase">{dateRange(item)}</p>
        <h3 className="font-serif text-lg leading-snug font-black text-stone-900">
          <Link href={`/${item.slug}`} className="hover:text-somerset-green">
            {item.title}
          </Link>
        </h3>
        {sub && <p className="mt-0.5 line-clamp-1 text-sm text-stone-500">{sub}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/${item.slug}`} className="rounded-full bg-somerset-green px-4 py-2 text-sm font-bold text-white hover:opacity-90">
          View details
        </Link>
        <TripHeart id={item.id} title={item.title} slug={item.slug} heroImageUrl={item.heroImageUrl} className="border border-stone-200 shadow-none" />
        {item.bookingUrl && (
          <a
            href={item.bookingUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-damson px-4 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            Tickets
          </a>
        )}
      </div>
    </article>
  );
}

export function EventsExplorer({
  result,
  searchParams,
  basePath,
  extras,
}: {
  result: ExplorerResult;
  searchParams: SP;
  basePath: string;
  extras: {
    submitHref?: string | null;
    carnival?: { title: string; summary: string | null; href: string } | null;
  };
}) {
  const sp = searchParams;
  const view = sp.view === "calendar" ? "calendar" : sp.view === "map" ? "map" : "list";
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const activeMonth = sp.month ?? (sp.when?.startsWith("month:") ? sp.when.slice(6) : todayKey.slice(0, 7));
  const eventDays = new Set(result.eventDays);
  const next = result.items.find((i) => i.startDate && dayKey(i.startDate) >= todayKey) ?? result.items.find((i) => i.startDate) ?? null;

  // Group the current page of events by their start day.
  const groups = new Map<string, ExplorerItem[]>();
  for (const item of result.items) {
    const raw = item.startDate ? dayKey(item.startDate) : null;
    const k = raw ? (raw < todayKey ? todayKey : raw) : "undated";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }

  const keywordChips = [
    { label: "Family", q: "family" },
    { label: "Music", q: "music" },
    { label: "Carnivals", q: "carnival" },
  ];

  // Full calendar view needs the month grid of event titles.
  const monthFirst = new Date(`${activeMonth}-01T12:00:00`);
  const monthDays = new Date(monthFirst.getFullYear(), monthFirst.getMonth() + 1, 0).getDate();
  const offset = (monthFirst.getDay() + 6) % 7;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <nav aria-label="Breadcrumb" className="text-xs text-stone-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / <span>Festivals &amp; events</span>
      </nav>
      <h1 className="mt-3 font-serif text-4xl font-black tracking-tight text-stone-900 sm:text-5xl">Festivals &amp; events</h1>
      <p className="mt-2 text-stone-600">
        {result.next30.toLocaleString("en-GB")} {result.next30 === 1 ? "event" : "events"} in Somerset over the next 30 days.
      </p>

      {/* Month rail + filters + view toggle */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-stone-200 pb-5">
        {result.months.slice(0, 6).map((m) => {
          const active = sp.when === `month:${m.key}`;
          const short = new Date(`${m.key}-01T12:00:00`).toLocaleDateString("en-GB", { month: "short" });
          return (
            <Chip key={m.key} href={buildHref(basePath, sp, { when: active ? undefined : `month:${m.key}`, month: m.key, day: undefined })} active={active}>
              {short} · {m.count}
            </Chip>
          );
        })}
        <span className="mx-1 hidden h-6 w-px bg-stone-200 sm:block" />
        <Chip href={buildHref(basePath, sp, { when: undefined, day: undefined })} active={!sp.when && !sp.day}>
          Any date
        </Chip>
        <Chip href={buildHref(basePath, sp, { when: sp.when === "weekend" ? undefined : "weekend", day: undefined })} active={sp.when === "weekend"}>
          This weekend
        </Chip>
        {result.counts.free > 0 && (
          <Chip href={buildHref(basePath, sp, { free: sp.free ? undefined : "1" })} active={!!sp.free}>
            Free
          </Chip>
        )}
        {keywordChips.map((k) => (
          <Chip key={k.q} href={buildHref(basePath, sp, { q: sp.q === k.q ? undefined : k.q })} active={sp.q === k.q}>
            {k.label}
          </Chip>
        ))}
        <div className="ml-auto flex items-center gap-3">
          <div className="flex overflow-hidden rounded-full border border-stone-200 text-sm font-semibold">
            {(["list", "calendar", "map"] as const).map((v) => (
              <Link
                key={v}
                href={buildHref(basePath, sp, { view: v === "list" ? undefined : v })}
                className={cn("px-3.5 py-1.5 capitalize", view === v ? "bg-somerset-green text-white" : "text-stone-700 hover:bg-cool-grey")}
              >
                {v}
              </Link>
            ))}
          </div>
          {extras.submitHref && (
            <Link href={extras.submitHref} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-bold text-stone-800 hover:border-somerset-green">
              Submit an event
            </Link>
          )}
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-6 h-[36rem]">
          <ExplorerMap pins={result.mapPins} />
        </div>
      ) : view === "calendar" ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-serif text-2xl font-black text-stone-900">
              {monthFirst.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-1">
              {[-1, 1].map((delta) => {
                const d = new Date(monthFirst.getFullYear(), monthFirst.getMonth() + delta, 1);
                const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                return (
                  <Link key={delta} href={buildHref(basePath, sp, { month: k })} className="rounded-full border border-stone-200 p-2 hover:bg-cool-grey" aria-label={delta < 0 ? "Previous month" : "Next month"}>
                    {delta < 0 ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-7 overflow-hidden rounded-3xl border border-stone-200 bg-white text-sm">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d} className="border-b border-stone-200 bg-cool-grey px-2 py-2 text-xs font-semibold text-stone-500">
                {d}
              </div>
            ))}
            {Array.from({ length: Math.ceil((offset + monthDays) / 7) * 7 }, (_, i) => {
              const day = i - offset + 1;
              if (day < 1 || day > monthDays) return <div key={i} className="min-h-24 border-b border-r border-stone-100 bg-stone-50/50" />;
              const key = `${activeMonth}-${String(day).padStart(2, "0")}`;
              // The page of results is date-sorted; the calendar shows whichever of those fall on this day.
              const dayEvents = result.items.filter((e) => e.startDate && dayKey(e.startDate) <= key && key <= dayKey(e.endDate ?? e.startDate));
              return (
                <div key={i} className="min-h-24 border-b border-r border-stone-100 p-1.5">
                  <p className={cn("text-xs font-semibold", key === todayKey ? "text-somerset-green" : "text-stone-500")}>{day}</p>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link key={e.id} href={`/${e.slug}`} className="block truncate rounded bg-somerset-green/10 px-1.5 py-0.5 text-[11px] font-medium text-deep-green hover:bg-somerset-green/20">
                        {e.title}
                      </Link>
                    ))}
                    {dayEvents.length > 3 && <p className="px-1 text-[11px] text-stone-500">+{dayEvents.length - 3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            {next && !sp.day && result.page === 1 && (
              <div className="grid overflow-hidden rounded-3xl bg-cool-grey sm:grid-cols-[1fr_1fr]">
                <div className="flex flex-col justify-center gap-3 p-7">
                  <p className="text-[11px] font-semibold tracking-wider text-damson uppercase">Next up</p>
                  <h2 className="font-serif text-3xl leading-tight font-black text-stone-900">{next.title}</h2>
                  <p className="text-sm text-stone-600">
                    {[dateRange(next), next.town].filter(Boolean).join(" · ")}
                  </p>
                  {next.summary && <p className="line-clamp-3 text-sm text-stone-600">{next.summary}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href={`/${next.slug}`} className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                      View details
                    </Link>
                    {next.bookingUrl && (
                      <a href={next.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                        {next.bookingLabel || "Book tickets"}
                      </a>
                    )}
                    <TripHeart id={next.id} title={next.title} slug={next.slug} heroImageUrl={next.heroImageUrl} className="border border-stone-300 shadow-none" />
                  </div>
                </div>
                <Img src={next.heroImageUrl} alt="" label={next.title} className="min-h-56 w-full" />
              </div>
            )}

            {result.matched === 0 ? (
              <div className="mt-6 rounded-3xl bg-cool-grey p-10 text-center">
                <p className="font-serif text-xl font-black text-stone-900">No events match</p>
                <p className="mt-1 text-sm text-stone-600">Try another month or clear the filters.</p>
                <Link href={basePath} className="mt-4 inline-block rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white">
                  Clear filters
                </Link>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {[...groups.entries()].map(([key, items]) => (
                  <section key={key}>
                    <h3 className="mb-3 flex items-baseline gap-3 font-serif text-xl font-black text-stone-900">
                      {key === "undated"
                        ? "Date to be confirmed"
                        : `${key === todayKey ? "Today · " : ""}${fmtDay(key, { weekday: "long", day: "numeric", month: "long" })}`}
                      <span className="font-sans text-xs font-medium text-stone-400">
                        {items.length} {items.length === 1 ? "event" : "events"}
                      </span>
                    </h3>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <EventRow key={item.id} item={item} sp={sp} todayKey={todayKey} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            {result.pageCount > 1 && (
              <div className="mt-8 flex justify-center gap-3">
                {result.page > 1 && (
                  <Link href={buildHref(basePath, sp, { page: String(result.page - 1) })} className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-somerset-green">
                    ← Earlier events
                  </Link>
                )}
                {result.page < result.pageCount && (
                  <Link href={buildHref(basePath, sp, { page: String(result.page + 1) })} className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold text-stone-700 hover:border-somerset-green">
                    Load the next {result.pageSize} events
                  </Link>
                )}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <MiniCalendar
              monthKey={activeMonth}
              eventDays={eventDays}
              selectedDay={sp.day}
              basePath={basePath}
              sp={sp}
              todayKey={todayKey}
            />
            {extras.carnival && (
              <div className="rounded-3xl bg-somerset-green p-6 text-white">
                <p className="text-[11px] font-semibold tracking-wider text-white/70 uppercase">Somerset original</p>
                <h3 className="mt-1 font-serif text-2xl font-black">{extras.carnival.title}</h3>
                {extras.carnival.summary && <p className="mt-2 line-clamp-4 text-sm text-white/90">{extras.carnival.summary}</p>}
                <Link href={extras.carnival.href} className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-deep-green hover:opacity-90">
                  See all carnival dates
                </Link>
              </div>
            )}
            {extras.submitHref && (
              <div className="rounded-3xl bg-cool-grey p-6">
                <h3 className="font-serif text-xl font-black text-stone-900">Running an event?</h3>
                <p className="mt-1 text-sm text-stone-600">Members can list events free. Listings appear here and on the map.</p>
                <Link href={extras.submitHref} className="mt-4 inline-block rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                  Submit your event
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
