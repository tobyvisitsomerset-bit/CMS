"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, FolderPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import {
  createCollectionAction,
  listMyCollectionsAction,
  toggleInCollectionAction,
  type CollectionSummary,
} from "@/app/(site)/account/collections/actions";

// "Add to a collection" for signed-in visitors. Signed-out visitors are
// pointed at creating a free account instead.
export function AddToCollectionButton({ pageId }: { pageId: string }) {
  const { signedIn } = useTrip();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<CollectionSummary[] | null>(null);
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !signedIn) return;
    void listMyCollectionsAction(pageId).then(setList);
  }, [open, signedIn, pageId]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trigger =
    "inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:border-somerset-green";

  if (!signedIn) {
    return (
      <Link href="/account/sign-up" className={trigger}>
        <FolderPlus className="size-4" /> Add to a collection
      </Link>
    );
  }

  return (
    <div className="relative" ref={box}>
      <button type="button" className={trigger} onClick={() => setOpen((o) => !o)}>
        <FolderPlus className="size-4" /> Add to a collection
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
          <ul className="max-h-48 space-y-1 overflow-y-auto">
            {(list ?? []).map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const r = await toggleInCollectionAction(c.id, pageId);
                      setList((cur) => (cur ?? []).map((x) => (x.id === c.id ? { ...x, hasPage: r.added } : x)));
                      toast.success(r.added ? `Added to ${c.name}` : `Removed from ${c.name}`);
                    })
                  }
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-stone-50"
                >
                  <span>{c.name}</span>
                  {c.hasPage && <Check className="size-4 text-somerset-green" />}
                </button>
              </li>
            ))}
            {list && list.length === 0 && <li className="px-2 py-1.5 text-xs text-stone-500">No collections yet. Make your first below.</li>}
          </ul>
          <form
            className="mt-2 flex gap-2 border-t border-stone-100 pt-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              start(async () => {
                try {
                  const c = await createCollectionAction(name, pageId);
                  setList((cur) => [{ id: c.id, name: c.name, hasPage: true }, ...(cur ?? [])]);
                  setName("");
                  toast.success(`Added to ${c.name}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not create it.");
                }
              });
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="New collection"
              className="h-8 flex-1 rounded-lg border border-stone-300 px-2 text-sm"
            />
            <button type="submit" disabled={pending} className="inline-flex items-center rounded-full bg-somerset-green px-3 text-xs font-bold text-white">
              <Plus className="size-3.5" /> New
            </button>
          </form>
          <Link href="/account/collections" className="mt-2 block text-xs font-semibold text-somerset-green hover:underline">
            Manage my collections
          </Link>
        </div>
      )}
    </div>
  );
}
