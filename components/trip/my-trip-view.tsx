"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarPlus, Link2, Mail, Plus, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { buildShareUrl, fetchTripDetails, mergeSharedTripLink, type TripDetail } from "@/lib/trip-share";
import { buildIcsCalendar, type CalendarEventInput } from "@/lib/calendar-export";
import type { TripItem } from "@/lib/trip-storage";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { cn } from "@/lib/utils";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-3xl bg-somerset-green/10" />,
});

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", opts);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "trip";
}

const FIELD = "rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-800 focus:border-somerset-green focus:outline-none";

export function MyTripView() {
  const trip = useTrip();
  const { activeTrip, items } = trip;
  const searchParams = useSearchParams();
  const addParam = searchParams.get("add");
  const mergedFor = useRef<string | null>(null);
  const [details, setDetails] = useState<Record<string, TripDetail>>({});
  const [newTripName, setNewTripName] = useState("");
  const [showNew, setShowNew] = useState(false);

  // Shared-link merge (?add=a,b,c).
  useEffect(() => {
    if (!addParam || mergedFor.current === addParam) return;
    mergedFor.current = addParam;
    const ids = addParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    mergeSharedTripLink(ids).then(() => toast("Trip synced from shared link"));
  }, [addParam]);

  // Real details for the places in every trip (coordinates, dates, address).
  const allIdsKey = trip.trips.flatMap((t) => t.items.map((i) => i.id)).sort().join(",");
  useEffect(() => {
    const ids = allIdsKey ? allIdsKey.split(",") : [];
    let cancelled = false;
    fetchTripDetails(ids).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
  }, [allIdsKey]);

  // Build the list of days for the active trip.
  const days = useMemo(() => {
    const set = new Set<string>();
    if (activeTrip.startDate) {
      const end = activeTrip.endDate && activeTrip.endDate >= activeTrip.startDate ? activeTrip.endDate : activeTrip.startDate;
      for (let d = activeTrip.startDate, n = 0; d <= end && n < 21; d = addDays(d, 1), n++) set.add(d);
    }
    for (const i of items) if (i.day) set.add(i.day);
    return [...set].sort();
  }, [activeTrip.startDate, activeTrip.endDate, items]);

  const unplaced = items.filter((i) => !i.day);
  const byDay = (day: string) => items.filter((i) => i.day === day);

  // Numbering follows day order, then list order within a day.
  const ordered: TripItem[] = [...days.flatMap((d) => byDay(d)), ...unplaced];
  const numberOf = new Map(ordered.map((i, idx) => [i.id, idx + 1]));

  const pins = ordered
    .map((i) => ({ item: i, d: details[i.id] }))
    .filter((p): p is { item: TripItem; d: TripDetail & { lat: number; lng: number } } => p.d?.lat != null && p.d?.lng != null)
    .map((p) => ({ id: p.item.id, lat: p.d.lat, lng: p.d.lng, title: p.item.title, href: `/${p.item.slug}`, label: String(numberOf.get(p.item.id)) }));

  let totalMiles = 0;
  for (let i = 1; i < pins.length; i++) totalMiles += haversineMiles(pins[i - 1], pins[i]);

  const emptyDays = days.filter((d) => byDay(d).length === 0);

  const calendarEvents = (): CalendarEventInput[] =>
    ordered.flatMap((i): CalendarEventInput[] => {
      const d = details[i.id];
      const url = typeof window !== "undefined" ? `${window.location.origin}/${i.slug}` : undefined;
      if (d?.startDate) {
        return [
          {
            title: i.title,
            start: new Date(d.startDate),
            end: d.endDate ? new Date(d.endDate) : undefined,
            allDay: /T00:00:00/.test(d.startDate),
            location: d.address ?? undefined,
            url,
          },
        ];
      }
      if (i.day) {
        const start = new Date(`${i.day}T00:00:00`);
        return [{ title: i.title, start, allDay: true, location: d?.address ?? undefined, url, description: i.note }];
      }
      return [];
    });

  const downloadCalendar = () => {
    const events = calendarEvents();
    if (events.length === 0) {
      toast("Pin places to a day (or add dated events) to export a calendar.");
      return;
    }
    const blob = new Blob([buildIcsCalendar(events, { reminderDayBefore: true })], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(activeTrip.name)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    const url = buildShareUrl(items, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied — open it on another device to sync this trip.");
    } catch {
      toast("Couldn't copy the link — your browser may be blocking clipboard access.");
    }
  };

  const emailHref = () => {
    const lines = ordered.map((i, idx) => {
      const day = i.day ? `${fmtDay(i.day, { weekday: "short", day: "numeric", month: "short" })} — ` : "";
      return `${idx + 1}. ${day}${i.title}\n   ${window.location.origin}/${i.slug}`;
    });
    const body = `${activeTrip.name}\n\n${lines.join("\n\n")}\n\nSee it again: ${buildShareUrl(items, window.location.origin)}`;
    return `mailto:?subject=${encodeURIComponent(`My Somerset trip: ${activeTrip.name}`)}&body=${encodeURIComponent(body)}`;
  };

  const dayOptions = days;

  const renderItem = (item: TripItem) => {
    const d = details[item.id];
    const idx = items.findIndex((i) => i.id === item.id);
    const info = [
      d?.startDate ? fmtDay(d.startDate.slice(0, 10), { weekday: "short", day: "numeric", month: "short" }) : null,
      d?.town,
      d?.isStay ? "Stay" : null,
    ].filter(Boolean);
    return (
      <article className="flex flex-wrap items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-somerset-green text-sm font-bold text-white">
          {numberOf.get(item.id)}
        </span>
        <Link href={`/${item.slug}`} className="shrink-0">
          <Img src={item.heroImageUrl} alt="" label="" className="size-16 rounded-2xl" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/${item.slug}`} className="font-serif text-lg leading-tight font-black text-stone-900 hover:text-somerset-green">
            {item.title}
          </Link>
          {info.length > 0 && <p className="text-sm text-stone-500">{info.join(" · ")}</p>}
          <input
            type="text"
            defaultValue={item.note ?? ""}
            onBlur={(e) => e.target.value !== (item.note ?? "") && trip.setNote(item.id, e.target.value)}
            placeholder="Add a note…"
            className="mt-1 w-full border-b border-dashed border-stone-200 bg-transparent py-0.5 text-xs text-stone-600 placeholder:text-stone-400 focus:border-somerset-green focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {d?.bookingUrl && (
            <a href={d.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full bg-damson px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              {d.bookingLabel || "Book"}
            </a>
          )}
          <select
            aria-label="Day"
            value={item.day ?? ""}
            onChange={(e) => trip.setDay(item.id, e.target.value || null)}
            className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700"
          >
            <option value="">Unplaced</option>
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {fmtDay(day, { weekday: "short", day: "numeric", month: "short" })}
              </option>
            ))}
          </select>
          <button type="button" aria-label="Move up" disabled={idx <= 0} onClick={() => trip.move(item.id, -1)} className="rounded-full p-1.5 text-stone-500 hover:bg-cool-grey disabled:opacity-30">
            <ArrowUp className="size-4" />
          </button>
          <button type="button" aria-label="Move down" disabled={idx >= items.length - 1} onClick={() => trip.move(item.id, 1)} className="rounded-full p-1.5 text-stone-500 hover:bg-cool-grey disabled:opacity-30">
            <ArrowDown className="size-4" />
          </button>
          <button type="button" aria-label={`Remove ${item.title}`} onClick={() => trip.remove(item.id, activeTrip.id)} className="rounded-full p-1.5 text-stone-500 hover:bg-cool-grey hover:text-damson">
            <Trash2 className="size-4" />
          </button>
        </div>
      </article>
    );
  };

  const between = (list: TripItem[], idx: number) => {
    if (idx === 0) return null;
    const a = details[list[idx - 1].id];
    const b = details[list[idx].id];
    if (a?.lat == null || b?.lat == null || a.lng == null || b.lng == null) return null;
    const miles = haversineMiles({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng });
    return (
      <p className="rounded-2xl border border-dashed border-stone-200 px-4 py-1.5 text-xs text-stone-500">
        About {miles < 10 ? miles.toFixed(1) : Math.round(miles)} miles apart (straight line)
      </p>
    );
  };

  const dateLine = [
    activeTrip.startDate
      ? `${fmtDay(activeTrip.startDate, { day: "numeric", month: "long" })}${
          activeTrip.endDate && activeTrip.endDate !== activeTrip.startDate ? ` – ${fmtDay(activeTrip.endDate, { day: "numeric", month: "long" })}` : ""
        }`
      : null,
    activeTrip.guests,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="print:text-sm">
      {/* Trip switcher */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {trip.trips.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => trip.switchTrip(t.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              t.id === activeTrip.id ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green",
            )}
          >
            {t.name} <span className="opacity-70">· {t.items.length}</span>
          </button>
        ))}
        {showNew ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              trip.newTrip(newTripName);
              setNewTripName("");
              setShowNew(false);
            }}
          >
            <input autoFocus value={newTripName} onChange={(e) => setNewTripName(e.target.value)} placeholder="Trip name" className={FIELD} />
            <button type="submit" className="rounded-full bg-somerset-green px-4 py-2 text-sm font-bold text-white">
              Create
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setShowNew(true)} className="flex items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-600 hover:border-somerset-green">
            <Plus className="size-4" /> New trip
          </button>
        )}
      </div>

      {/* Header */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          {dateLine && <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">{dateLine}</p>}
          <input
            key={activeTrip.id}
            aria-label="Trip name"
            defaultValue={activeTrip.name}
            onBlur={(e) => e.target.value.trim() && e.target.value !== activeTrip.name && trip.editTrip(activeTrip.id, { name: e.target.value.trim() })}
            className="mt-1 w-full max-w-xl bg-transparent font-serif text-4xl font-black tracking-tight text-stone-900 focus:outline-none focus:ring-0 sm:text-5xl"
          />
          <p className="mt-1 text-sm text-stone-500">
            {items.length} place{items.length === 1 ? "" : "s"}
            {pins.length > 1 ? ` · about ${Math.round(totalMiles)} miles between them (straight line)` : ""} · saved on this device
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <a href={items.length ? emailHref() : undefined} aria-disabled={items.length === 0} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-somerset-green">
            <Mail className="size-4" /> Email me this trip
          </a>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-somerset-green">
            <Printer className="size-4" /> Print
          </button>
          <Link href="/places-to-stay" className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
            Book the gaps
          </Link>
        </div>
      </div>

      {/* Trip settings */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600 print:hidden">
        <label className="flex items-center gap-2">
          From
          <input type="date" value={activeTrip.startDate ?? ""} onChange={(e) => trip.editTrip(activeTrip.id, { startDate: e.target.value || null })} className={FIELD} />
        </label>
        <label className="flex items-center gap-2">
          To
          <input type="date" value={activeTrip.endDate ?? ""} onChange={(e) => trip.editTrip(activeTrip.id, { endDate: e.target.value || null })} className={FIELD} />
        </label>
        <label className="flex items-center gap-2">
          Who&apos;s going
          <input
            key={activeTrip.id}
            defaultValue={activeTrip.guests ?? ""}
            onBlur={(e) => trip.editTrip(activeTrip.id, { guests: e.target.value || null })}
            placeholder="2 adults, 1 dog"
            className={FIELD}
          />
        </label>
        {trip.trips.length > 1 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${activeTrip.name}"?`)) trip.removeTrip(activeTrip.id);
            }}
            className="ml-auto text-xs font-semibold text-stone-500 hover:text-damson"
          >
            Delete this trip
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-stone-300 p-12 text-center">
          <p className="font-serif text-2xl font-black text-stone-900">Nothing in this trip yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
            Tap the heart on any place, event or stay and it lands here. You can pin each one to a day and take the whole plan with you.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/things-to-do" className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white">
              Things to do
            </Link>
            <Link href="/festivals-events" className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800">
              What&apos;s on
            </Link>
            <Link href="/places-to-stay" className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800">
              Places to stay
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-8">
            {unplaced.length > 0 && (
              <section>
                <h2 className="mb-3 font-serif text-2xl font-black text-stone-900">
                  {days.length > 0 ? "Not placed on a day yet" : "Your places"}
                </h2>
                <div className="space-y-3">
                  {unplaced.map((item, idx) => (
                    <div key={item.id} className="space-y-2">
                      {between(unplaced, idx)}
                      {renderItem(item)}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {days.map((day) => {
              const list = byDay(day);
              return (
                <section key={day}>
                  <h2 className="mb-3 font-serif text-2xl font-black text-stone-900">
                    {fmtDay(day)}
                    {list.length === 0 && <span className="ml-3 font-sans text-sm font-medium text-stone-400">nothing planned</span>}
                  </h2>
                  {list.length > 0 ? (
                    <div className="space-y-3">
                      {list.map((item, idx) => (
                        <div key={item.id} className="space-y-2">
                          {between(list, idx)}
                          {renderItem(item)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Link href="/things-to-do" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-somerset-green">
                        + Add a place
                      </Link>
                      <Link href="/festivals-events" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-somerset-green">
                        See what&apos;s on
                      </Link>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <aside className="space-y-5 print:hidden">
            {pins.length > 0 && (
              <div className="space-y-2">
                <LeafletMap pins={pins} zoom={10} height="18rem" />
                <Link href="/interactive-map" className="text-sm font-bold text-somerset-green hover:underline">
                  Open in map
                </Link>
              </div>
            )}
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <h3 className="font-serif text-xl font-black text-stone-900">Take it with you</h3>
              <p className="mt-1 text-sm text-stone-600">Add the whole trip to your calendar, or get a link that opens it on another device.</p>
              <div className="mt-4 flex flex-col gap-2">
                <button type="button" onClick={downloadCalendar} className="flex items-center justify-center gap-2 rounded-full bg-somerset-green px-5 py-3 text-sm font-bold text-white hover:opacity-90">
                  <CalendarPlus className="size-4" /> Add all {items.length} to calendar
                </button>
                <button type="button" onClick={copyShareLink} className="flex items-center justify-center gap-2 rounded-full border border-stone-300 px-5 py-3 text-sm font-bold text-stone-800 hover:border-somerset-green">
                  <Link2 className="size-4" /> Get a shareable link
                </button>
              </div>
            </div>
            {emptyDays.length > 0 && (
              <div className="rounded-3xl bg-cool-grey p-5">
                <h3 className="font-serif text-lg font-black text-stone-900">
                  {emptyDays.length === 1 ? "One gap left" : `${emptyDays.length} gaps left`}
                </h3>
                <p className="mt-1 text-sm text-stone-600">
                  {emptyDays.length === 1 ? fmtDay(emptyDays[0]) : emptyDays.map((d) => fmtDay(d, { weekday: "short" })).join(", ")} still
                  {emptyDays.length === 1 ? " has" : " have"} nothing planned.
                </p>
                <Link href="/things-to-do" className="mt-3 inline-block text-sm font-bold text-somerset-green hover:underline">
                  Find something to do →
                </Link>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
