"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";
import { useMediaUpload } from "./use-media-upload";
import { cn } from "@/lib/utils";

// A list of pictures: upload one or many (or drop them on the box) and they
// are added to the list straight away.
export function GalleryField({
  urls,
  onChange,
  max = 24,
  disabled,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadFiles } = useMediaUpload();

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = Math.max(0, max - urls.length);
    const added = await uploadFiles(Array.from(files).slice(0, room));
    if (added.length) onChange([...urls, ...added].slice(0, max));
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div
      className={cn("space-y-3 rounded-lg", over && "ring-2 ring-somerset-green")}
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(false);
        void handle(e.dataTransfer.files);
      }}
    >
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <div key={`${url}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-16 w-24 rounded-md border object-cover" />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(urls.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-neutral-500 shadow ring-1 ring-neutral-200 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => void handle(e.target.files)}
          />
          <Button type="button" size="sm" disabled={uploading || urls.length >= max} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Upload photos"}
          </Button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            or choose from the library
          </button>
          <span className="text-xs text-neutral-400">
            {urls.length === 0 ? "You can also drop photos here." : `${urls.length} of ${max}`}
          </span>
        </div>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={(u) => onChange([...urls, u].slice(0, max))} />
    </div>
  );
}
