"use client";

import { FileText, Film, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MediaItem = {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  kind: string;
  createdAt: Date | string;
  uploadedBy?: { name: string } | null;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaTile({
  item,
  selected,
  onClick,
}: {
  item: MediaItem;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-lg border bg-white text-left transition-colors hover:border-emerald-400",
        selected && "border-emerald-500 ring-2 ring-emerald-200",
      )}
    >
      <div className="flex h-28 items-center justify-center bg-neutral-100">
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.filename} className="h-full w-full object-cover" />
        ) : item.kind === "video" ? (
          <Film className="h-8 w-8 text-neutral-400" />
        ) : item.kind === "pdf" ? (
          <FileText className="h-8 w-8 text-neutral-400" />
        ) : (
          <FileIcon className="h-8 w-8 text-neutral-400" />
        )}
      </div>
      <div className="space-y-0.5 p-2">
        <p className="truncate text-xs font-medium text-neutral-700">{item.filename}</p>
        <p className="text-[11px] text-neutral-400">{formatSize(item.size)}</p>
      </div>
    </button>
  );
}
