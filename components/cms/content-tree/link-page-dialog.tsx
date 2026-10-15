"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { linkExistingPageAction, searchPagesAction } from "@/app/cms/actions";

type Hit = { id: string; title: string; slug: string; status: string; isSection: boolean };

// Kentico's "Link existing page": choose a page that already exists and show
// it under this one too. The original stays the real page; the link follows it.
export function LinkPageDialog({
  open,
  onOpenChange,
  parentId,
  parentTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  parentTitle: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [result, setResult] = useState<{ q: string; hits: Hit[] }>({ q: "", hits: [] });
  const [pending, start] = useTransition();

  const term = q.trim();
  const hits = open && term.length >= 2 && result.q === term ? result.hits : [];

  useEffect(() => {
    if (!open || term.length < 2) return;
    const t = setTimeout(() => {
      void searchPagesAction(term).then((rows) => setResult({ q: term, hits: rows as Hit[] }));
    }, 250);
    return () => clearTimeout(t);
  }, [term, open]);

  function close(next: boolean) {
    if (!next) setQ("");
    onOpenChange(next);
  }

  function link(target: Hit) {
    if (!parentId) return;
    start(async () => {
      try {
        await linkExistingPageAction(parentId, target.id);
        toast.success(`"${target.title}" is now also under ${parentTitle}`);
        close(false);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not link that page.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link existing page under {parentTitle || "the root"}</DialogTitle>
          <DialogDescription>
            Search for a page. It will show here as well as where it already lives, and it is listed on this section&apos;s page.
          </DialogDescription>
        </DialogHeader>
        {!parentId ? (
          <p className="text-sm text-neutral-500">Select a page or section in the tree first, then choose Link existing page.</p>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type at least two letters of the page name" className="pl-8" />
            </div>
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    disabled={pending || h.id === parentId}
                    onClick={() => link(h)}
                    className="flex w-full items-start gap-2 rounded-md border border-transparent px-2 py-2 text-left text-sm hover:border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
                  >
                    <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-somerset-green" />
                    <span>
                      <strong>{h.title}</strong>
                      <span className="block text-xs text-neutral-500">
                        /{h.slug}
                        {h.status !== "PUBLISHED" ? ` · ${h.status.toLowerCase().replace("_", " ")}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
              {term.length >= 2 && result.q === term && hits.length === 0 && <li className="px-2 py-2 text-sm text-neutral-400">No pages found.</li>}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
