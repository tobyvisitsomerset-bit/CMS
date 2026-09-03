"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaTile, type MediaItem } from "./media-tile";
import { useMediaUpload } from "./use-media-upload";
import { listMediaAction } from "@/app/cms/actions";

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function refresh() {
    startTransition(async () => {
      setMedia(await listMediaAction({ search: search || undefined }));
    });
  }

  useEffect(() => {
    if (open) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  const { uploading, uploadFiles } = useMediaUpload(refresh);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Choose media</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="h-8 pl-7 text-sm"
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files, null);
              e.target.value = "";
            }}
          />
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto py-1">
          {media.length === 0 && (
            <p className="col-span-4 py-8 text-center text-sm text-neutral-400">No media yet — upload something.</p>
          )}
          {media.map((item) => (
            <MediaTile
              key={item.id}
              item={item}
              onClick={() => {
                onSelect(item.url);
                onOpenChange(false);
              }}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
