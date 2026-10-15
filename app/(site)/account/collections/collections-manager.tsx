"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Share2, Trash2, X } from "lucide-react";
import {
  createCollectionAction,
  deleteCollectionAction,
  renameCollectionAction,
  setCollectionSharedAction,
  toggleInCollectionAction,
} from "./actions";

type Col = {
  id: string;
  name: string;
  token: string;
  isShared: boolean;
  items: { id: string; title: string; slug: string; imageUrl: string | null }[];
};

export function CollectionsManager({ collections }: { collections: Col[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");

  const run = (fn: () => Promise<unknown>, message?: string) =>
    start(async () => {
      try {
        await fn();
        if (message) toast.success(message);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Something went wrong.");
      }
    });

  async function copy(token: string) {
    const url = `${window.location.origin}/collections/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.message(url);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          run(async () => {
            await createCollectionAction(name);
            setName("");
          }, "Collection created");
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Name a new collection"
          className="h-11 flex-1 rounded-xl border border-stone-300 px-3 text-base"
        />
        <button type="submit" disabled={pending} className="rounded-full bg-damson px-5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
          Create
        </button>
      </form>

      {collections.length === 0 && (
        <p className="rounded-3xl border border-stone-200 bg-white p-8 text-sm text-stone-500">No collections yet. Create one above, then add places from any listing.</p>
      )}

      {collections.map((c) => (
        <section key={c.id} className="rounded-3xl border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              defaultValue={c.name}
              maxLength={60}
              aria-label="Collection name"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== c.name) run(() => renameCollectionAction(c.id, v), "Renamed");
              }}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-1 font-serif text-xl font-black text-stone-900 hover:border-stone-200 focus:border-somerset-green"
            />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <button
                type="button"
                onClick={() => run(() => setCollectionSharedAction(c.id, !c.isShared), c.isShared ? "No longer shared" : "Sharing is on")}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-semibold ${
                  c.isShared ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 hover:bg-stone-50"
                }`}
              >
                <Share2 className="size-4" /> {c.isShared ? "Shared" : "Share"}
              </button>
              {c.isShared && (
                <button type="button" onClick={() => copy(c.token)} className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-1.5 font-semibold hover:bg-stone-50">
                  <Copy className="size-4" /> Copy link
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${c.name}"? The places themselves are not affected.`)) run(() => deleteCollectionAction(c.id), "Deleted");
                }}
                className="inline-flex size-9 items-center justify-center rounded-full border border-stone-300 text-stone-600 hover:bg-stone-50"
                aria-label="Delete collection"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
          {c.isShared && <p className="mt-1 text-xs text-stone-500">Anyone with the link can see this collection. Your name and email are not shown.</p>}

          {c.items.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Empty. Use &ldquo;Add to a collection&rdquo; on any listing page.</p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {c.items.map((p) => (
                <div key={p.id} className="relative overflow-hidden rounded-2xl border border-stone-200">
                  <Link href={`/${p.slug}`}>
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="aspect-[4/3] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/3] items-center justify-center bg-cool-grey text-[10px] font-semibold tracking-wider text-stone-400 uppercase">Photo</div>
                    )}
                    <p className="p-2 text-sm font-semibold text-stone-900">{p.title}</p>
                  </Link>
                  <button
                    type="button"
                    onClick={() => run(() => toggleInCollectionAction(c.id, p.id))}
                    className="absolute right-1.5 top-1.5 rounded-full bg-white/90 p-1 text-stone-600 shadow hover:text-red-600"
                    aria-label={`Remove ${p.title}`}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
