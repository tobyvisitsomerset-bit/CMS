"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";

export function MediaPickerField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-14 w-20 rounded-md border object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-neutral-500 shadow ring-1 ring-neutral-200 hover:text-red-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex h-14 w-20 items-center justify-center rounded-md border border-dashed text-neutral-300">
          <ImagePlus className="h-5 w-5" />
        </div>
      )}
      {!disabled && (
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
          {value ? "Change" : "Choose image"}
        </Button>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={onChange} />
    </div>
  );
}
