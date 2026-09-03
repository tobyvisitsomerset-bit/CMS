"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Upload, FolderPlus, Search, Trash2, X, Folder as FolderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MediaTile, type MediaItem } from "./media-tile";
import { useMediaUpload } from "./use-media-upload";
import {
  createMediaFolderAction,
  deleteMediaAction,
  getFolderTreeAction,
  getMediaUsageAction,
  getRecentMediaAction,
  getUnusedMediaAction,
  listMediaAction,
} from "@/app/cms/actions";

type Folder = { id: string; name: string; parentId: string | null };
type View = "all" | "recent" | "unused";

export function MediaLibrary() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [usage, setUsage] = useState<{ id: string; title: string }[] | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const refresh = useCallback(() => {
    startTransition(async () => {
      if (view === "recent") {
        setMedia(await getRecentMediaAction());
      } else if (view === "unused") {
        setMedia(await getUnusedMediaAction());
      } else {
        setMedia(await listMediaAction({ folderId: activeFolder ?? undefined, search: search || undefined }));
      }
    });
  }, [view, activeFolder, search]);

  const { uploading, uploadFiles } = useMediaUpload(refresh);

  useEffect(() => {
    getFolderTreeAction().then((f) => setFolders(f as unknown as Folder[]));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function selectMedia(item: MediaItem) {
    setSelected(item);
    setUsage(null);
    startTransition(async () => {
      setUsage(await getMediaUsageAction(item.url));
    });
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    await createMediaFolderAction(newFolderName.trim(), null);
    setNewFolderName("");
    setNewFolderOpen(false);
    setFolders(await getFolderTreeAction());
    toast.success("Folder created");
  }

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await deleteMediaAction(id);
    toast.success("Deleted");
    setSelected(null);
    setConfirmDeleteId(null);
    refresh();
  }

  return (
    <div className="flex h-full">
      <aside className="w-56 shrink-0 border-r bg-neutral-50 p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-700">Media</h2>
          <Button size="icon-sm" variant="ghost" title="New folder" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <nav className="space-y-0.5 text-sm">
          {(
            [
              ["all", "All media"],
              ["recent", "Recently uploaded"],
              ["unused", "Unused assets"],
            ] as [View, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                setView(key);
                setActiveFolder(null);
              }}
              className={`block w-full rounded-md px-2 py-1.5 text-left ${
                view === key ? "bg-emerald-50 font-medium text-emerald-900" : "hover:bg-neutral-100"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        {folders.length > 0 && (
          <>
            <p className="mt-4 mb-1 px-2 text-xs font-medium tracking-wide text-neutral-400 uppercase">Folders</p>
            <nav className="space-y-0.5 text-sm">
              {folders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setView("all");
                    setActiveFolder(f.id);
                  }}
                  className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left ${
                    view === "all" && activeFolder === f.id ? "bg-emerald-50 font-medium text-emerald-900" : "hover:bg-neutral-100"
                  }`}
                >
                  <FolderIcon className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
            </nav>
          </>
        )}
      </aside>

      <div
        className="flex min-w-0 flex-1 flex-col"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files, activeFolder);
        }}
      >
        <div className="flex items-center gap-2 border-b bg-white p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search media..."
              className="h-8 pl-7 text-sm"
            />
          </div>
          <div className="flex-1" />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files, activeFolder);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 ${dragOver ? "bg-emerald-50" : ""}`}>
          {media.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
              <Upload className="h-8 w-8" />
              <p className="text-sm">Drag and drop files here, or click Upload.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3 lg:grid-cols-5 xl:grid-cols-6">
              {media.map((item) => (
                <MediaTile key={item.id} item={item} selected={selected?.id === item.id} onClick={() => selectMedia(item)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <aside className="w-72 shrink-0 space-y-4 overflow-y-auto border-l bg-white p-4">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold break-all">{selected.filename}</h3>
            <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          {selected.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.url} alt={selected.filename} className="w-full rounded-md border" />
          )}
          <dl className="space-y-1 text-xs text-neutral-500">
            <div className="flex justify-between">
              <dt>Type</dt>
              <dd>{selected.mimeType}</dd>
            </div>
            <div className="flex justify-between">
              <dt>URL</dt>
              <dd className="max-w-40 truncate font-mono">{selected.url}</dd>
            </div>
          </dl>
          <div>
            <p className="mb-1 text-xs font-medium text-neutral-600">Used by</p>
            {usage === null && <p className="text-xs text-neutral-400">Checking...</p>}
            {usage?.length === 0 && <p className="text-xs text-neutral-400">Not used on any page.</p>}
            <ul className="space-y-0.5 text-xs text-emerald-700">
              {usage?.map((u) => (
                <li key={u.id}>{u.title}</li>
              ))}
            </ul>
          </div>
          <Button size="sm" variant="destructive" className="w-full" onClick={() => setConfirmDeleteId(selected.id)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete asset
          </Button>
        </aside>
      )}

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the file. Pages that reference it will show a broken image. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="folder-name">Folder name</Label>
            <Input id="folder-name" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
