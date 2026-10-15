"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaPickerDialog } from "./media-picker-dialog";
import { useMediaUpload } from "./use-media-upload";
import { cn } from "@/lib/utils";

// Upload first: choosing a file (or dropping one on the picture box) uploads
// it and puts it straight into the field. The library is a secondary option
// for re-using something already uploaded.
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
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadFiles } = useMediaUpload();

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    const urls = await uploadFiles([files[0]]);
    if (urls[0]) onChange(urls[0]);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="relative"
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
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn("h-14 w-20 rounded-md border object-cover", over && "ring-2 ring-somerset-green")} />
        ) : (
          <div
            className={cn(
              "flex h-14 w-20 items-center justify-center rounded-md border border-dashed text-neutral-300",
              over && "border-somerset-green text-somerset-green",
            )}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </div>
        )}
        {value && uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {value && !disabled && !uploading && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-neutral-500 shadow ring-1 ring-neutral-200 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {!disabled && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void handle(e.target.files)} />
          <Button type="button" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading..." : value ? "Replace" : "Upload image"}
          </Button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-medium text-neutral-500 underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            or choose from the library
          </button>
        </>
      )}
      <MediaPickerDialog open={open} onOpenChange={setOpen} onSelect={onChange} />
    </div>
  );
}
