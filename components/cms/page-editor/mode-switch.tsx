"use client";

import { cn } from "@/lib/utils";
import { useEditorMode, type EditorMode } from "@/components/cms/editor-mode-context";

export type { EditorMode };

const MODES: { value: EditorMode; label: string }[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
  { value: "listing", label: "Listing" },
];

// Kentico 11's grey Edit | Preview | Listing button group.
export function ModeSwitch() {
  const { mode, setMode } = useEditorMode();
  return (
    <div className="inline-flex overflow-hidden rounded-sm border border-[#b9b9b5] bg-[#d9d9d6]">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => setMode(m.value)}
          className={cn(
            "px-4 py-1.5 text-[13px] font-semibold text-[#4a4947] transition-colors",
            mode === m.value ? "bg-[#bdbdb8] text-[#262524]" : "hover:bg-[#cdcdc9]",
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
