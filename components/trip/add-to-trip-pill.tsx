"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Heart, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { cn } from "@/lib/utils";
import { Img } from "@/components/cms/page-builder/listing-ui";

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function dayLabel(day: string) {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

type Props = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  variant: "save" | "trip";
  /** ISO date of the event, if this page is dated (pre-selects its day). */
  dateKey?: string | null;
  fullWidth?: boolean;
};

// The two trip buttons on a detail page. "Save" is the quick one-tap heart;
// "Add to my trip" opens the dialog from the mockup pack — pick a trip and a
// day, then a toast confirms with Undo / View trip. Trips live on this device.
export function AddToTripPill({ id, title, slug, heroImageUrl, variant, dateKey, fullWidth }: Props) {
  const trip = useTrip();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const saved = trip.has(id);

  if (variant === "save") {
    return (
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          if (saved) {
            trip.remove(id);
            toast("Removed from your trip");
          } else {
            const before = trip.store;
            trip.add({ id, title, slug, heroImageUrl, day: dateKey ? dateKey.slice(0, 10) : null });
            toast(`Saved ${title}`, {
              action: { label: "View trip", onClick: () => router.push("/my-trip") },
              cancel: { label: "Undo", onClick: () => trip.restore(before) },
            });
          }
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-bold transition-colors",
          saved ? "border-damson bg-damson/10 text-damson" : "border-stone-300 bg-white text-stone-800 hover:border-somerset-green",
        )}
      >
        <Heart className={cn("size-4", saved && "fill-damson")} />
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-colors",
          fullWidth ? "w-full" : "",
          saved ? "border border-somerset-green bg-somerset-green/10 text-deep-green" : "border border-stone-300 bg-white text-stone-800 hover:border-somerset-green",
        )}
      >
        {saved ? <Check className="size-4" /> : <Plus className="size-4" />}
        {saved ? "In your trip" : "Add to my trip"}
      </button>
      {open && (
        <AddToTripDialog
          id={id}
          title={title}
          slug={slug}
          heroImageUrl={heroImageUrl}
          dateKey={dateKey ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AddToTripDialog({
  id,
  title,
  slug,
  heroImageUrl,
  dateKey,
  onClose,
}: {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  dateKey: string | null;
  onClose: () => void;
}) {
  const trip = useTrip();
  const router = useRouter();
  const [tripChoice, setTripChoice] = useState<string>(trip.activeTrip.id);
  const [newName, setNewName] = useState("");
  const eventDay = dateKey ? dateKey.slice(0, 10) : null;
  const [day, setDay] = useState<string | null>(eventDay);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const chosen = trip.trips.find((t) => t.id === tripChoice);
  const days: string[] = [];
  if (chosen?.startDate) {
    const end = chosen.endDate && chosen.endDate >= chosen.startDate ? chosen.endDate : chosen.startDate;
    for (let d = chosen.startDate, n = 0; d <= end && n < 14; d = addDays(d, 1), n++) days.push(d);
  }
  if (eventDay && !days.includes(eventDay)) days.unshift(eventDay);

  const confirm = () => {
    const before = trip.store;
    let target = tripChoice;
    if (tripChoice === "__new") {
      target = trip.newTrip(newName.trim() || "New trip", eventDay ? { startDate: eventDay, endDate: eventDay } : {});
    } else {
      trip.switchTrip(tripChoice);
    }
    trip.add({ id, title, slug, heroImageUrl, day }, target);
    onClose();
    toast(`Added to ${tripChoice === "__new" ? newName.trim() || "your new trip" : chosen?.name ?? "your trip"}`, {
      description: day ? `${dayLabel(day)} · ${title}` : title,
      action: { label: "View trip", onClick: () => router.push("/my-trip") },
      cancel: { label: "Undo", onClick: () => trip.restore(before) },
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Add to my trip">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-stone-900/50" />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 rounded-full p-1.5 text-stone-500 hover:bg-cool-grey">
          <X className="size-4" />
        </button>
        <h2 className="font-serif text-2xl font-black text-stone-900">Add to my trip</h2>
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-cool-grey p-3">
          <Img src={heroImageUrl} alt="" label="" className="size-14 shrink-0 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate font-serif text-base font-black text-stone-900">{title}</p>
            {eventDay && <p className="text-xs text-stone-500">{dayLabel(eventDay)}</p>}
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-stone-900">Which trip?</legend>
          <div className="mt-2 space-y-2">
            {trip.trips.map((t) => (
              <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm has-[:checked]:border-somerset-green has-[:checked]:bg-somerset-green/5">
                <input type="radio" name="trip" checked={tripChoice === t.id} onChange={() => setTripChoice(t.id)} className="accent-[#3d685b]" />
                <span className="flex-1 font-medium text-stone-900">{t.name}</span>
                <span className="text-xs text-stone-500">
                  {t.items.length} place{t.items.length === 1 ? "" : "s"}
                </span>
              </label>
            ))}
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 px-4 py-2.5 text-sm has-[:checked]:border-somerset-green has-[:checked]:bg-somerset-green/5">
              <input type="radio" name="trip" checked={tripChoice === "__new"} onChange={() => setTripChoice("__new")} className="accent-[#3d685b]" />
              <span className="font-medium text-stone-900">Start a new trip…</span>
            </label>
            {tripChoice === "__new" && (
              <input
                type="text"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name your trip, e.g. Carnival weekend"
                className="w-full rounded-2xl border border-stone-200 px-4 py-2.5 text-sm focus:border-somerset-green focus:outline-none"
              />
            )}
          </div>
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold text-stone-900">Which day?</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                  day === d ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green",
                )}
              >
                {dayLabel(d)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDay(null)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium",
                day === null ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green",
              )}
            >
              Unplaced
            </button>
            <label className="flex items-center gap-2 text-sm text-stone-500">
              <span>or pick</span>
              <input
                type="date"
                value={day && !days.includes(day) ? day : ""}
                onChange={(e) => setDay(e.target.value || null)}
                className="rounded-full border border-stone-200 px-3 py-1 text-sm"
              />
            </label>
          </div>
        </fieldset>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-somerset-green">
            Cancel
          </button>
          <button type="button" onClick={confirm} className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
            Add to trip
          </button>
        </div>
      </div>
    </div>
  );
}
