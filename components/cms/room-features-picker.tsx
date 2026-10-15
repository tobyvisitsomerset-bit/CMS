"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

// Tick what a room has instead of typing a comma list. The value is still the
// same comma separated text the site already stores and shows.

export const ROOM_FEATURE_GROUPS: { label: string; items: string[] }[] = [
  { label: "Sleeping", items: ["Double bed", "King size bed", "Twin beds", "Single bed", "Cot available", "Sofa bed", "Sleeps 2", "Sleeps 4", "Family room"] },
  { label: "Bathroom", items: ["En-suite", "Private bathroom", "Bath", "Shower", "Walk-in shower", "Hairdryer", "Toiletries"] },
  { label: "In the room", items: ["Free Wi-Fi", "TV", "Tea and coffee", "Kettle", "Mini fridge", "Kitchenette", "Desk", "Iron and board", "Safe", "Heating", "Air conditioning"] },
  { label: "View and outdoors", items: ["Sea view", "Countryside view", "Garden view", "Balcony", "Terrace", "Patio", "Hot tub"] },
  { label: "Good to know", items: ["Breakfast included", "Dog friendly", "Accessible room", "Ground floor", "Private parking", "Non-smoking", "Fireplace"] },
];

function toList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function RoomFeaturesPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const current = toList(value);
  const known = new Set(ROOM_FEATURE_GROUPS.flatMap((g) => g.items.map((i) => i.toLowerCase())));
  const extras = current.filter((c) => !known.has(c.toLowerCase()));
  const has = (f: string) => current.some((c) => c.toLowerCase() === f.toLowerCase());

  function toggle(f: string) {
    if (disabled) return;
    onChange((has(f) ? current.filter((c) => c.toLowerCase() !== f.toLowerCase()) : [...current, f]).join(", "));
  }

  function addCustom() {
    const v = custom.trim().slice(0, 40);
    if (!v || has(v)) {
      setCustom("");
      return;
    }
    onChange([...current, v].join(", "));
    setCustom("");
  }

  const chip = (f: string) => (
    <button
      key={f}
      type="button"
      disabled={disabled}
      onClick={() => toggle(f)}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        has(f) ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 bg-white text-stone-700 hover:border-somerset-green",
        disabled && "opacity-60",
      )}
    >
      {f}
    </button>
  );

  return (
    <div className="space-y-3">
      {ROOM_FEATURE_GROUPS.map((g) => (
        <div key={g.label}>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">{g.label}</p>
          <div className="flex flex-wrap gap-1.5">{g.items.map(chip)}</div>
        </div>
      ))}
      {extras.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">Your own</p>
          <div className="flex flex-wrap gap-1.5">{extras.map(chip)}</div>
        </div>
      )}
      {!disabled && (
        <div className="flex max-w-sm gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add something else"
            className="h-8 flex-1 rounded-lg border border-stone-300 px-2.5 text-sm"
          />
          <button type="button" onClick={addCustom} className="rounded-full border border-stone-300 px-3 text-xs font-semibold hover:bg-stone-50">
            Add
          </button>
        </div>
      )}
    </div>
  );
}
