"use client";

import { cn } from "@/lib/utils";

export type EditorMode = "edit" | "preview" | "listing";

const MODES: { value: EditorMode; label: string }[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
  { value: "listing", label: "Listing" },
];

export function ModeSwitch({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  return (
    <div className="inline-flex rounded-md border bg-white p-0.5">
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "rounded px-3 py-1 text-sm font-medium transition-colors",
            mode === m.value ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
