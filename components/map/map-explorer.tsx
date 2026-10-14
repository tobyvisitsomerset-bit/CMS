"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LocateFixed, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { cn } from "@/lib/utils";
import type { CanvasPin } from "./map-canvas";

const MapCanvas = dynamic(() => import("./map-canvas").then((m) => m.MapCanvas), {
  ssr: false,
  loading: () => <div className="h-full min-h-[30rem] animate-pulse bg-somerset-green/10" />,
});

export type MapPinInput = {
  id: string;
  title: string;
  slug: string;
  lat: number;
  lng: number;
  town: string | null;
  heroImageUrl: string | null;
  layer: "stay" | "do" | "eat" | "events" | "places";
  startDate: string | null;
  endDate: string | null;
};

const LAYERS: { key: MapPinInput["layer"]; label: string }[] = [
  { key: "stay", label: "Places to stay" },
  { key: "do", label: "Things to do" },
  { key: "eat", label: "Food & drink" },
  { key: "events", label: "Festivals & events" },
  { key: "places", label: "Towns & other places" },
];

function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function dateLabel(p: MapPinInput): string | null {
  if (!p.startDate) return null;
  const f = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return p.endDate && p.endDate.slice(0, 10) !== p.startDate.slice(0, 10) ? `${f(p.startDate)} – ${f(p.endDate)}` : f(p.startDate);
}

const NEAR_RADIUS = 10;

// The live map from the mockup pack (screen 05): layers rail on the left, the
// map in the middle, and a "your trip" rail on the right that numbers the
// route as you add places. Every pin is a real page with real coordinates.
export function MapExplorer({ pins, initialQuery }: { pins: MapPinInput[]; initialQuery: string }) {
  const trip = useTrip();
  const [active, setActive] = useState<Set<MapPinInput["layer"]>>(new Set(LAYERS.map((l) => l.key)));
  const [query, setQuery] = useState(initialQuery);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [nearOnly, setNearOnly] = useState(false);

  const counts = useMemo(() => {
    const c = new Map<MapPinInput["layer"], number>();
    for (const p of pins) c.set(p.layer, (c.get(p.layer) ?? 0) + 1);
    return c;
  }, [pins]);

  const q = query.trim().toLowerCase();
  const tripIds = new Set(trip.items.map((i) => i.id));

  const visible = useMemo(
    () =>
      pins.filter((p) => {
        if (!active.has(p.layer)) return false;
        if (q && !`${p.title} ${p.town ?? ""}`.toLowerCase().includes(q)) return false;
        if (nearOnly && me && haversineMiles(me, p) > NEAR_RADIUS) return false;
        return true;
      }),
    [pins, active, q, nearOnly, me],
  );

  const canvasPins: CanvasPin[] = visible.map((p) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    title: p.title,
    slug: p.slug,
    town: p.town,
    heroImageUrl: p.heroImageUrl,
    categoryLabel: LAYERS.find((l) => l.key === p.layer)?.label ?? "",
    dateLabel: dateLabel(p),
    inTrip: tripIds.has(p.id),
  }));

  const byId = new Map(pins.map((p) => [p.id, p]));
  const route = trip.items
    .map((i) => ({ item: i, pin: byId.get(i.id) }))
    .filter((r): r is { item: (typeof trip.items)[number]; pin: MapPinInput } => !!r.pin)
    .map((r) => ({ id: r.item.id, lat: r.pin.lat, lng: r.pin.lng, title: r.item.title }));

  const toggleTrip = (pin: CanvasPin) => {
    if (tripIds.has(pin.id)) {
      trip.remove(pin.id);
      toast("Removed from your trip");
    } else {
      trip.add({ id: pin.id, title: pin.title, slug: pin.slug, heroImageUrl: pin.heroImageUrl });
      toast(`Added ${pin.title} to your trip`);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast("Your browser can't share a location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearOnly(true);
      },
      () => toast("We couldn't get your location — check your browser's permission."),
      { timeout: 8000 },
    );
  };

  const focus = me ? { lat: me.lat, lng: me.lng, zoom: 11 } : null;

  const toggleLayer = (key: MapPinInput["layer"]) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div className="grid h-[calc(100vh-10rem)] min-h-[34rem] grid-cols-1 overflow-hidden border-y border-stone-200 bg-white lg:grid-cols-[17rem_minmax(0,1fr)_19rem]">
      {/* Layers rail */}
      <aside className="space-y-5 overflow-y-auto border-r border-stone-200 p-5">
        <div>
          <h1 className="font-serif text-2xl font-black text-stone-900">Map</h1>
          <p className="text-xs text-stone-500">
            {visible.length.toLocaleString("en-GB")} of {pins.length.toLocaleString("en-GB")} places shown
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-full border border-stone-200 px-4 py-2 focus-within:border-somerset-green">
          <Search className="size-4 text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a place"
            className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
          />
        </label>
        <div>
          <p className="mb-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Layers</p>
          <ul className="space-y-1.5">
            {LAYERS.map((l) => {
              const n = counts.get(l.key) ?? 0;
              if (n === 0) return null;
              return (
                <li key={l.key}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 text-sm hover:bg-cool-grey">
                    <input type="checkbox" checked={active.has(l.key)} onChange={() => toggleLayer(l.key)} className="size-4 accent-[#3d685b]" />
                    <span className="flex-1 font-medium text-stone-800">{l.label}</span>
                    <span className="text-xs text-stone-400">{n.toLocaleString("en-GB")}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <button
            type="button"
            onClick={me ? () => setNearOnly((v) => !v) : locate}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold",
              nearOnly && me ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 text-stone-800 hover:border-somerset-green",
            )}
          >
            <LocateFixed className="size-4" />
            {me ? (nearOnly ? `Within ${NEAR_RADIUS} miles of you` : "Show near me only") : "Near me"}
          </button>
          {me && (
            <button type="button" onClick={() => { setMe(null); setNearOnly(false); }} className="mt-2 w-full text-center text-xs font-semibold text-stone-500 hover:underline">
              Clear location
            </button>
          )}
        </div>
      </aside>

      {/* Map */}
      <div className="relative min-h-[26rem]">
        <MapCanvas pins={canvasPins} route={route} focus={focus} me={me} onToggleTrip={toggleTrip} />
      </div>

      {/* Trip rail */}
      <aside className="space-y-4 overflow-y-auto border-l border-stone-200 p-5">
        <div>
          <h2 className="font-serif text-xl font-black text-stone-900">{trip.activeTrip.name}</h2>
          <p className="text-xs text-stone-500">
            {trip.items.length} place{trip.items.length === 1 ? "" : "s"} · kept on this device
          </p>
        </div>
        {trip.items.length === 0 ? (
          <p className="rounded-2xl bg-cool-grey p-4 text-sm text-stone-600">
            Click any pin, then <strong>Add to trip</strong> — your route builds here, numbered, and stays on this device.
          </p>
        ) : (
          <ol className="space-y-2">
            {trip.items.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-stone-200 p-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-damson text-xs font-bold text-white">{idx + 1}</span>
                <Link href={`/${item.slug}`} className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900 hover:text-somerset-green">
                  {item.title}
                </Link>
                <button type="button" aria-label={`Remove ${item.title}`} onClick={() => trip.remove(item.id)} className="rounded-full p-1.5 text-stone-400 hover:bg-cool-grey hover:text-damson">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ol>
        )}
        <Link href="/my-trip" className="block rounded-full bg-somerset-green px-5 py-2.5 text-center text-sm font-bold text-white hover:opacity-90">
          Open my trip
        </Link>
      </aside>
    </div>
  );
}
