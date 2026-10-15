"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, BedDouble, ListChecks, Minus, PlusCircle, CalendarPlus, Check, Copy, Heart, Printer, RefreshCw, Share2, Trash2, Utensils, Landmark, PartyPopper } from "lucide-react";
import { addDayAction, alternativesAction, generateItineraryAction, saveItineraryAction, swapItemAction } from "@/app/(site)/plan/actions";
import { DayMap } from "@/components/plan/day-map";
import { useTrip } from "@/lib/trip-context";
import { buildIcsCalendar, type CalendarEventInput } from "@/lib/calendar-export";
import { INTERESTS, defaultPrefs, itineraryTitle, type Itinerary, type PlanItem, type Prefs, type Slot } from "@/lib/itinerary";
import { ACCESS_FEATURES } from "@/lib/accessibility";
import { cn } from "@/lib/utils";

const SLOT_LABEL: Record<Slot, string> = {
  stay: "Where you stay",
  morning: "Morning",
  lunch: "Lunch",
  afternoon: "Afternoon",
  evening: "Evening",
};

const SLOT_TIME: Record<Exclude<Slot, "stay">, [number, number]> = {
  morning: [10, 0],
  lunch: [12, 30],
  afternoon: [14, 30],
  evening: [18, 30],
};

const KIND_ICON = { stay: BedDouble, do: Landmark, food: Utensils, event: PartyPopper } as const;

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function atTime(date: string, [h, m]: [number, number]) {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d, h, m);
}

function Chip({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
        active ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 bg-white text-stone-700 hover:border-somerset-green",
      )}
    >
      {children}
    </button>
  );
}

export function ItineraryBuilder({ initial = null, token: initialToken = null }: { initial?: Itinerary | null; token?: string | null }) {
  const trip = useTrip();
  const [prefs, setPrefs] = useState<Prefs>(initial?.prefs ?? defaultPrefs());
  const [it, setIt] = useState<Itinerary | null>(initial);
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, start] = useTransition();
  const [swapping, setSwapping] = useState<string | null>(null);
  const [alts, setAlts] = useState<{ uid: string; items: PlanItem[] | null } | null>(null);

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setPrefs((p) => ({ ...p, [k]: v }));
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const shareUrl = useMemo(() => (token && typeof window !== "undefined" ? `${window.location.origin}/plan/${token}` : null), [token]);

  function build() {
    start(async () => {
      try {
        const result = await generateItineraryAction(prefs);
        setIt(result);
        setToken(null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        toast.error("Sorry, we couldn't build that. Please try again.");
      }
    });
  }

  function update(next: Itinerary) {
    setIt(next);
  }

  async function swap(uid: string) {
    if (!it) return;
    setSwapping(uid);
    try {
      update(await swapItemAction(it, uid));
    } catch {
      toast.error("Couldn't find another suggestion.");
    } finally {
      setSwapping(null);
    }
  }

  async function showAlternatives(uid: string) {
    if (!it) return;
    if (alts?.uid === uid) {
      setAlts(null);
      return;
    }
    setAlts({ uid, items: null });
    try {
      setAlts({ uid, items: await alternativesAction(it, uid) });
    } catch {
      setAlts(null);
      toast.error("Couldn't load alternatives.");
    }
  }

  function chooseAlternative(uid: string, next: PlanItem) {
    if (!it) return;
    const swapIn = (old: PlanItem): PlanItem => ({ ...next, uid: old.uid, slot: old.slot });
    if (it.stay && it.stay.uid === uid) {
      update({ ...it, stay: swapIn(it.stay), skipped: [...it.skipped, it.stay.id] });
    } else {
      const skipped = [...it.skipped];
      update({
        ...it,
        days: it.days.map((d) => ({
          ...d,
          items: d.items.map((x) => {
            if (x.uid !== uid) return x;
            skipped.push(x.id);
            return swapIn(x);
          }),
        })),
        skipped,
      });
    }
    setAlts(null);
  }

  function addDay() {
    if (!it) return;
    start(async () => {
      try {
        setIt(await addDayAction(it));
      } catch {
        toast.error("Couldn't add a day.");
      }
    });
  }

  function removeLastDay() {
    if (!it || it.days.length <= 1) return;
    const days = it.days.slice(0, -1);
    setIt({ ...it, days, prefs: { ...it.prefs, endDate: days[days.length - 1].date } });
  }

  function remove(dayIdx: number, uid: string) {
    if (!it) return;
    update({ ...it, days: it.days.map((d, i) => (i === dayIdx ? { ...d, items: d.items.filter((x) => x.uid !== uid) } : d)) });
  }

  function move(dayIdx: number, idx: number, dir: -1 | 1) {
    if (!it) return;
    const items = [...it.days[dayIdx].items];
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
    update({ ...it, days: it.days.map((d, i) => (i === dayIdx ? { ...d, items } : d)) });
  }

  function save() {
    if (!it) return;
    start(async () => {
      try {
        const res = await saveItineraryAction(it, token);
        setToken(res.token);
        try {
          const raw = localStorage.getItem("vs-itineraries");
          const list: { token: string; title: string }[] = raw ? JSON.parse(raw) : [];
          const next = [{ token: res.token, title: res.title }, ...list.filter((x) => x.token !== res.token)].slice(0, 20);
          localStorage.setItem("vs-itineraries", JSON.stringify(next));
        } catch {
          /* storage unavailable */
        }
        toast.success("Saved. Your link is ready to share.");
      } catch {
        toast.error("Could not save. Please try again.");
      }
    });
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied");
    } catch {
      toast.message(shareUrl);
    }
  }

  function addToTrip() {
    if (!it) return;
    const name = itineraryTitle(it);
    const tripId = trip.newTrip(name, {
      startDate: it.prefs.startDate,
      endDate: it.prefs.endDate,
      guests: `${it.prefs.adults} adult${it.prefs.adults === 1 ? "" : "s"}${it.prefs.children ? `, ${it.prefs.children} child${it.prefs.children === 1 ? "" : "ren"}` : ""}`,
    });
    if (it.stay) trip.add({ id: it.stay.id, title: it.stay.title, slug: it.stay.slug, heroImageUrl: it.stay.imageUrl, day: it.prefs.startDate }, tripId);
    for (const d of it.days) {
      for (const i of d.items) trip.add({ id: i.id, title: i.title, slug: i.slug, heroImageUrl: i.imageUrl, day: d.date }, tripId);
    }
    trip.switchTrip(tripId);
    toast.success("Added to My Trip");
  }

  function downloadCalendar() {
    if (!it) return;
    const origin = window.location.origin;
    const events: CalendarEventInput[] = [];
    if (it.stay) {
      events.push({
        title: `Stay: ${it.stay.title}`,
        start: atTime(it.prefs.startDate, [0, 0]),
        end: atTime(it.prefs.endDate, [0, 0]),
        allDay: true,
        location: it.stay.town ?? undefined,
        url: `${origin}/${it.stay.slug}`,
      });
    }
    for (const d of it.days) {
      for (const i of d.items) {
        if (i.slot === "stay") continue;
        const start = atTime(d.date, SLOT_TIME[i.slot as Exclude<Slot, "stay">]);
        events.push({
          title: i.title,
          description: [SLOT_LABEL[i.slot], i.priceText, i.note].filter(Boolean).join(" · "),
          location: i.town ?? undefined,
          url: `${origin}/${i.slug}`,
          start,
          end: new Date(start.getTime() + 90 * 60000),
          allDay: i.kind === "event",
        });
      }
    }
    const blob = new Blob([buildIcsCalendar(events, { reminderDayBefore: true })], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-somerset-itinerary.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar file downloaded. Open it to add every activity.");
  }

  // ------------------------------------------------------------ result view
  if (it) {
    const party = `${it.prefs.adults} adult${it.prefs.adults === 1 ? "" : "s"}${it.prefs.children ? `, ${it.prefs.children} child${it.prefs.children === 1 ? "" : "ren"}` : ""}`;
    return (
      <div className="mx-auto max-w-5xl px-6 py-10 print:py-0">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">Your Somerset itinerary</p>
        <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">{itineraryTitle(it)}</h1>
        <p className="mt-1 text-stone-600">
          {dayLabel(it.prefs.startDate)} to {dayLabel(it.prefs.endDate)} · {party}
          {it.prefs.dog ? " · with a dog" : ""}
        </p>

        <div className="mt-5 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={save} disabled={pending} className="inline-flex items-center gap-2 rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50">
            <Share2 className="size-4" /> {token ? "Update saved copy" : "Save and share"}
          </button>
          {shareUrl && (
            <button type="button" onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
              <Copy className="size-4" /> Copy link
            </button>
          )}
          <button type="button" onClick={addToTrip} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
            <Heart className="size-4" /> Add to My Trip
          </button>
          <button type="button" onClick={downloadCalendar} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
            <CalendarPlus className="size-4" /> Add all to calendar
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
            <Printer className="size-4" /> Print or save as PDF
          </button>
          <button type="button" onClick={() => { setIt(null); setToken(null); }} className="rounded-full px-4 py-2.5 text-sm font-semibold text-stone-600 underline-offset-2 hover:underline">
            Change my answers
          </button>
        </div>
        {shareUrl && <p className="mt-3 break-all text-sm text-stone-500 print:hidden">Share link: {shareUrl}</p>}

        {it.notes.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-2xl bg-cool-grey p-4 text-sm text-stone-700">
            {it.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        <DayMap it={it} />

        {it.stay && (
          <section className="mt-8">
            <h2 className="font-serif text-2xl font-black text-stone-900">Where you stay</h2>
            <div className="mt-3">
              <ItemCard item={it.stay} busy={swapping === it.stay.uid} onSwap={() => swap(it.stay!.uid)} onChoose={() => showAlternatives(it.stay!.uid)} />
              {alts?.uid === it.stay.uid && <AltList alts={alts.items} onPick={(n) => chooseAlternative(it.stay!.uid, n)} />}
            </div>
          </section>
        )}

        <div className="mt-8 space-y-8">
          {it.days.map((d, di) => (
            <section key={d.date}>
              <h2 className="font-serif text-2xl font-black text-stone-900">
                Day {di + 1} <span className="font-sans text-base font-medium text-stone-500">· {dayLabel(d.date)}</span>
              </h2>
              <div className="mt-3 space-y-3">
                {d.items.length === 0 && <p className="rounded-2xl border border-dashed border-stone-300 p-4 text-sm text-stone-500">Nothing matched for this day. Try other interests or a wider area.</p>}
                {d.items.map((item, idx) => (
                  <div key={item.uid}>
                  <ItemCard
                    item={item}
                    busy={swapping === item.uid}
                    onSwap={() => swap(item.uid)}
                    onChoose={() => showAlternatives(item.uid)}
                    onRemove={() => remove(di, item.uid)}
                    onUp={idx > 0 ? () => move(di, idx, -1) : undefined}
                    onDown={idx < d.items.length - 1 ? () => move(di, idx, 1) : undefined}
                  />
                  {alts?.uid === item.uid && <AltList alts={alts.items} onPick={(n) => chooseAlternative(item.uid, n)} />}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-2 print:hidden">
          <button type="button" onClick={addDay} disabled={pending || it.days.length >= 14} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50">
            <PlusCircle className="size-4" /> Add another day
          </button>
          {it.days.length > 1 && (
            <button type="button" onClick={removeLastDay} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
              <Minus className="size-4" /> Remove the last day
            </button>
          )}
        </div>

        <p className="mt-10 text-xs text-stone-500">
          Suggestions come from real Visit Somerset listings. Opening times, prices and availability should always be confirmed with each business before you go.
        </p>
      </div>
    );
  }

  // ------------------------------------------------------------ question view
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">Build My Somerset Itinerary</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">Plan your Somerset break in a minute</h1>
      <p className="mt-2 text-stone-600">Answer a few questions and we&apos;ll put together a day-by-day plan from real places to stay, things to do, food and events. You can change anything afterwards.</p>

      <div className="mt-8 space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-700">
            Arriving
            <input type="date" value={prefs.startDate} onChange={(e) => set("startDate", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
          </label>
          <label className="block text-sm font-semibold text-stone-700">
            Leaving
            <input type="date" value={prefs.endDate} min={prefs.startDate} onChange={(e) => set("endDate", e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
          </label>
          <label className="block text-sm font-semibold text-stone-700">
            Adults
            <input type="number" min={1} max={12} value={prefs.adults} onChange={(e) => set("adults", Number(e.target.value) || 1)} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
          </label>
          <label className="block text-sm font-semibold text-stone-700">
            Children
            <input type="number" min={0} max={12} value={prefs.children} onChange={(e) => set("children", Number(e.target.value) || 0)} className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base" />
          </label>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-700">What are you into?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <Chip key={i.key} active={prefs.interests.includes(i.key)} onClick={() => set("interests", toggle(prefs.interests, i.key))}>
                {prefs.interests.includes(i.key) && <Check className="mr-1 inline size-3.5" />}
                {i.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-700">How busy do you want to be?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["relaxed", "Relaxed", "About three things a day"],
                ["balanced", "Balanced", "A good mix"],
                ["packed", "Packed", "Make the most of it"],
              ] as const
            ).map(([k, label, sub]) => (
              <button
                key={k}
                type="button"
                onClick={() => set("pace", k)}
                className={cn("rounded-2xl border px-4 py-3 text-left", prefs.pace === k ? "border-somerset-green bg-somerset-green/5" : "border-stone-300 bg-white")}
              >
                <span className="block text-sm font-bold text-stone-900">{label}</span>
                <span className="block text-xs text-stone-500">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-stone-700">
            Budget for the whole trip, excluding travel (optional)
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">£</span>
              <input
                type="number"
                min={20}
                value={prefs.budget ?? ""}
                onChange={(e) => set("budget", e.target.value ? Number(e.target.value) : null)}
                className="h-11 w-full rounded-xl border border-stone-300 pl-7 pr-3 text-base"
                placeholder="No limit"
              />
            </div>
            <span className="mt-1 block text-xs font-normal text-stone-500">With a budget we only use listings that state a price.</span>
          </label>
          <label className="block text-sm font-semibold text-stone-700">
            Base yourself near (optional)
            <input
              value={prefs.area ?? ""}
              onChange={(e) => set("area", e.target.value || null)}
              placeholder="e.g. Wells, Bath, Minehead"
              className="mt-1 h-11 w-full rounded-xl border border-stone-300 px-3 text-base"
            />
          </label>
        </div>

        <div>
          <p className="text-sm font-semibold text-stone-700">Anything we should plan around?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={prefs.dog} onClick={() => set("dog", !prefs.dog)}>
              Bringing a dog
            </Chip>
            {ACCESS_FEATURES.filter((f) => f.key !== "dogFriendly").map((f) => (
              <Chip key={f.key} active={prefs.access.includes(f.key)} onClick={() => set("access", toggle(prefs.access, f.key))}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={build}
            disabled={pending}
            className="rounded-full bg-damson px-7 py-3 text-base font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Building your itinerary..." : "Build my itinerary"}
          </button>
          <Link href="/my-trip" className="text-sm font-semibold text-somerset-green hover:underline">
            Go to My Trip
          </Link>
        </div>
      </div>
    </div>
  );
}

function ItemCard({
  item,
  busy,
  onSwap,
  onChoose,
  onRemove,
  onUp,
  onDown,
}: {
  item: PlanItem;
  busy: boolean;
  onSwap: () => void;
  onChoose?: () => void;
  onRemove?: () => void;
  onUp?: () => void;
  onDown?: () => void;
}) {
  const Icon = KIND_ICON[item.kind];
  const btn = "inline-flex size-9 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-40";
  return (
    <article className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" className="h-28 w-full shrink-0 rounded-2xl object-cover sm:h-24 sm:w-36" />
      ) : (
        <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-2xl bg-cool-grey text-stone-400 sm:w-36">
          <Icon className="size-7" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">
          <Icon className="size-3.5" /> {SLOT_LABEL[item.slot]}
        </p>
        <Link href={`/${item.slug}`} className="font-serif text-xl leading-tight font-black text-stone-900 hover:text-somerset-green">
          {item.title}
        </Link>
        <p className="mt-0.5 text-sm text-stone-500">{[item.town, item.priceText].filter(Boolean).join(" · ")}</p>
        {item.access.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.access.slice(0, 4).map((k) => (
              <span key={k} className="rounded-full bg-somerset-green/10 px-2 py-0.5 text-[11px] font-semibold text-somerset-green">
                {ACCESS_FEATURES.find((f) => f.key === k)?.short ?? k}
              </span>
            ))}
          </div>
        )}
        {item.note && <p className="mt-1 text-xs font-medium text-damson">{item.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 print:hidden">
        <button type="button" className={btn} title="Swap for something else" disabled={busy} onClick={onSwap}>
          <RefreshCw className={cn("size-4", busy && "animate-spin")} />
        </button>
        {onChoose && (
          <button type="button" className={btn} title="Choose from a few alternatives" onClick={onChoose}>
            <ListChecks className="size-4" />
          </button>
        )}
        {onUp && (
          <button type="button" className={btn} title="Move earlier" onClick={onUp}>
            <ArrowUp className="size-4" />
          </button>
        )}
        {onDown && (
          <button type="button" className={btn} title="Move later" onClick={onDown}>
            <ArrowDown className="size-4" />
          </button>
        )}
        {onRemove && (
          <button type="button" className={btn} title="Remove" onClick={onRemove}>
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </article>
  );
}

function AltList({ alts, onPick }: { alts: PlanItem[] | null; onPick: (item: PlanItem) => void }) {
  return (
    <div className="mt-2 rounded-2xl border border-stone-200 bg-cool-grey p-3 print:hidden">
      <p className="text-xs font-semibold tracking-wide text-stone-500 uppercase">Or choose one of these</p>
      {alts === null && <p className="mt-2 text-sm text-stone-500">Looking...</p>}
      {alts && alts.length === 0 && <p className="mt-2 text-sm text-stone-500">No other places match your answers nearby.</p>}
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">
        {(alts ?? []).map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onPick(a)}
              className="flex w-full items-center gap-3 rounded-xl bg-white p-2 text-left hover:ring-2 hover:ring-somerset-green"
            >
              {a.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.imageUrl} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="size-14 shrink-0 rounded-lg bg-stone-200" />
              )}
              <span className="min-w-0">
                <strong className="block truncate text-sm text-stone-900">{a.title}</strong>
                <span className="block truncate text-xs text-stone-500">{[a.town, a.priceText].filter(Boolean).join(" · ")}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
