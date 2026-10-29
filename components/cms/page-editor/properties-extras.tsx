"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addRelatedPageAction,
  deletePageAction,
  linkExistingPageAction,
  listLinkedPagesAction,
  listRelatedPagesAction,
  removeRelatedPageAction,
  savePageCategoriesAction,
  searchPagesAction,
  setPageMenuAction,
} from "@/app/cms/actions";
import { MENU_GROUPS, type MenuGroup } from "@/lib/menu-group";

// The Properties menu sections that Kentico has and we did not:
// Categories, Navigation, Related pages and Linked pages.

type Found = { id: string; title: string; slug: string; status: string; isSection: boolean };

function Box({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-3 bg-[#e5e5e5] px-4 py-2 text-[15px] font-semibold text-[#262524]">{title}</h2>
      <div className="space-y-4 px-2 text-sm">
        {intro && <p className="text-neutral-600">{intro}</p>}
        {children}
      </div>
    </div>
  );
}

function PageSearch({ onPick, exclude, placeholder }: { onPick: (p: Found) => void; exclude: string[]; placeholder: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      void searchPagesAction(q).then((r) => live && setResults(r as Found[]));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const shown = q.trim().length < 2 ? [] : results.filter((r) => !exclude.includes(r.id));
  return (
    <div className="space-y-2">
      <Input placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
      {shown.length > 0 && (
        <ul className="max-h-56 divide-y overflow-y-auto rounded border bg-white">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="flex w-full flex-col px-3 py-2 text-left hover:bg-neutral-50"
                onClick={() => {
                  onPick(r);
                  setQ("");
                  setResults([]);
                }}
              >
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-neutral-500">/{r.slug}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CategoriesSection({ pageId, initial, canEdit }: { pageId: string; initial: string[]; canEdit: boolean }) {
  const router = useRouter();
  const [cats, setCats] = useState(initial);
  const [draft, setDraft] = useState("");
  const [pending, start] = useTransition();
  const add = () => {
    const v = draft.trim();
    if (v && !cats.some((c) => c.toLowerCase() === v.toLowerCase())) setCats([...cats, v]);
    setDraft("");
  };
  return (
    <Box title="Categories" intro="Categories group pages by theme. Type a name and press Add, then Save.">
      <div className="flex flex-wrap gap-2">
        {cats.length === 0 && <span className="text-neutral-400">No categories yet.</span>}
        {cats.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full bg-somerset-green/10 px-3 py-1 text-xs font-semibold text-somerset-green">
            {c}
            {canEdit && (
              <button type="button" aria-label={`Remove ${c}`} onClick={() => setCats(cats.filter((x) => x !== c))}>
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {canEdit && (
        <div className="flex gap-2">
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="New category" className="max-w-xs" />
          <Button type="button" variant="outline" onClick={add}>
            Add
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                try {
                  await savePageCategoriesAction(pageId, cats);
                  toast.success("Categories saved");
                  router.refresh();
                } catch {
                  toast.error("Could not save the categories.");
                }
              })
            }
          >
            Save
          </Button>
        </div>
      )}
    </Box>
  );
}

export function NavigationSection({
  pageId,
  initial,
  canEdit,
}: {
  pageId: string;
  initial: { group: MenuGroup; newTab: boolean };
  canEdit: boolean;
}) {
  const router = useRouter();
  const [group, setGroup] = useState<MenuGroup>(initial.group);
  const [newTab, setNewTab] = useState(initial.newTab);
  const [pending, start] = useTransition();
  return (
    <Box
      title="Navigation"
      intro="Where this page appears in the website's menus. The order of the links is set on the Master page tab."
    >
      <div className="grid gap-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-center">
        <label className="font-semibold text-[#26688a] sm:text-right">Menu group:</label>
        <select
          className="h-9 max-w-md rounded-md border border-input bg-transparent px-2.5 text-sm"
          value={group}
          disabled={!canEdit}
          onChange={(e) => setGroup(e.target.value as MenuGroup)}
        >
          {MENU_GROUPS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
        <label className="font-semibold text-[#26688a] sm:text-right">Open link in new tab:</label>
        <input type="checkbox" className="justify-self-start" checked={newTab} disabled={!canEdit} onChange={(e) => setNewTab(e.target.checked)} />
      </div>
      {canEdit ? (
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              try {
                await setPageMenuAction(pageId, group, newTab);
                toast.success("Navigation saved");
                router.refresh();
              } catch (e) {
                toast.error(e instanceof Error && e.message ? e.message : "Could not save.");
              }
            })
          }
        >
          Save
        </Button>
      ) : (
        <p className="text-xs text-neutral-500">Only people who can publish can change the menus.</p>
      )}
    </Box>
  );
}

export function RelatedSection({ pageId, canEdit }: { pageId: string; canEdit: boolean }) {
  const [items, setItems] = useState<{ id: string; title: string; slug: string; status: string }[] | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    void listRelatedPagesAction(pageId).then(setItems);
  }, [pageId]);
  const reload = () => void listRelatedPagesAction(pageId).then(setItems);
  return (
    <Box
      title="Related pages"
      intro="Pages to suggest alongside this one. Published related pages appear under the page on the website."
    >
      {items === null ? (
        <p className="text-neutral-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-400">No related pages yet.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {items.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                <Link href={`/cms/${r.id}`} className="font-medium text-[#26688a] hover:underline">
                  {r.title}
                </Link>
                <span className="ml-2 text-xs text-neutral-500">
                  /{r.slug}
                  {r.status !== "PUBLISHED" ? " (not published, so not shown on the site)" : ""}
                </span>
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-700 hover:underline"
                  onClick={() => start(async () => (await removeRelatedPageAction(pageId, r.id), reload()))}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <PageSearch
          placeholder="Search for a page to add..."
          exclude={[pageId, ...(items ?? []).map((i) => i.id)]}
          onPick={(p) =>
            start(async () => {
              try {
                await addRelatedPageAction(pageId, p.id);
                reload();
              } catch (e) {
                toast.error(e instanceof Error && e.message ? e.message : "Could not add it.");
              }
            })
          }
        />
      )}
    </Box>
  );
}

export function LinkedSection({ pageId, canEdit }: { pageId: string; canEdit: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<{ id: string; parentTitle: string; parentSlug: string }[] | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    void listLinkedPagesAction(pageId).then(setItems);
  }, [pageId]);
  const reload = () => {
    void listLinkedPagesAction(pageId).then(setItems);
    router.refresh();
  };
  return (
    <Box
      title="Linked pages"
      intro="A page can also appear in other places in the tree without being copied. Edit the original and every link shows the change."
    >
      {items === null ? (
        <p className="text-neutral-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-neutral-400">This page is not linked anywhere else.</p>
      ) : (
        <ul className="divide-y rounded border bg-white">
          {items.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                Linked under <strong>{l.parentTitle}</strong>
                {l.parentSlug && <span className="ml-2 text-xs text-neutral-500">/{l.parentSlug}</span>}
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="text-xs font-semibold text-red-700 hover:underline"
                  onClick={() => {
                    if (!window.confirm("Remove this link? The original page is not affected.")) return;
                    start(async () => {
                      try {
                        await deletePageAction(l.id);
                        reload();
                      } catch {
                        toast.error("Could not remove the link.");
                      }
                    });
                  }}
                >
                  Remove link
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Also show this page under...</p>
          <PageSearch
            placeholder="Search for the page it should sit under..."
            exclude={[pageId]}
            onPick={(p) =>
              start(async () => {
                try {
                  await linkExistingPageAction(p.id, pageId);
                  toast.success(`Linked under ${p.title}`);
                  reload();
                } catch {
                  toast.error("Could not link it there.");
                }
              })
            }
          />
        </div>
      )}
    </Box>
  );
}
