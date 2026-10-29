"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { parseFocus } from "@/lib/page-display";

// Choose the part of a photo that must always stay in view. Click or drag on
// the picture; the four small previews show what phones, tablets, laptops and
// large screens will crop to.
const DEVICES: { label: string; ratio: string; color: string }[] = [
  { label: "Phone", ratio: "4 / 5", color: "#dc2626" },
  { label: "Tablet", ratio: "4 / 3", color: "#d97706" },
  { label: "Small laptop / iPad landscape", ratio: "2 / 1", color: "#16a34a" },
  { label: "Laptop & desktop", ratio: "3 / 1", color: "#2563eb" },
];

export function FocusPicker({
  imageUrl,
  value,
  onChange,
  disabled,
}: {
  imageUrl: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const focus = parseFocus(value) ?? { x: 50, y: 50 };

  if (!imageUrl) {
    return <p className="text-xs text-neutral-400">Choose a photo first, then set its focus point here.</p>;
  }

  function setFrom(e: React.PointerEvent) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.round(Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)));
    const y = Math.round(Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)));
    onChange(`${x},${y}`);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Click or drag on the photo to set the focus point. The small pictures show what each screen size will show.
      </p>
      <div
        ref={box}
        className={`relative max-w-lg cursor-crosshair touch-none overflow-hidden rounded-md border ${disabled ? "opacity-60" : ""}`}
        onPointerDown={(e) => {
          if (disabled) return;
          dragging.current = true;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          setFrom(e);
        }}
        onPointerMove={(e) => dragging.current && setFrom(e)}
        onPointerUp={() => (dragging.current = false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="block w-full select-none" draggable={false} />
        <span
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.45)]"
          style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {DEVICES.map((d) => (
          <div key={d.label} className="text-center">
            <div className="w-24 overflow-hidden rounded-sm border-2" style={{ aspectRatio: d.ratio, borderColor: d.color }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="size-full object-cover" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
            </div>
            <p className="mt-0.5 max-w-24 text-[10px] leading-tight text-neutral-500">{d.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange("")}>
          Reset to centre
        </Button>
        <span className="text-xs text-neutral-500">
          Focus: {focus.x}% {focus.y}% {value ? "" : "(centre)"}
        </span>
      </div>
    </div>
  );
}
