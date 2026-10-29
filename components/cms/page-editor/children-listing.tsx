"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { PageStatus } from "@prisma/client";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/cms/status-dot";
import { bulkPageAction, listChildPagesAction } from "@/app/cms/actions";
import { PAGE_TYPE_FILTERS, type ListingRow, type PageTypeFilter } from "@/lib/data/page-listing";

type Op = "contains" | "equals" | "startsWith";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Listing mode: the pages directly under the selected page as a table, with
 * the same filters, columns and "do this to the ticked pages" bar as Kentico.
 */
export function ChildrenListing({ pageId, parentId, canEdit }: { pageId: string; parentId: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pending, start] = useTransition();

  const [nameOp, setNameOp] = useState<Op>("contains");
  const [name, setName] = useState("");
  const [allLevels, setAllLevels] = useState(false);
  const [pageType, setPageType] = useState<PageTypeFilter>("all");
  const [pageSize, setPageSize] = useState(25);
  const [pageNo, setPageNo] = useState(0);
  const [applied, setApplied] = useState({ nameOp: "contains" as Op, name: "", allLevels: false, pageType: "all" as PageTypeFilter });

  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<"selected" | "all">("selected");
  const [action, setAction] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listChildPagesAction(pageId, { ...applied, page: pageNo, pageSize });
      setRows(res.rows);
      setTotal(res.total);
    } catch {
      toast.error("Could not load the list.");
    } finally {
      setLoading(false);
    }
  }, [pageId, applied, pageNo, pageSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads the table whenever the page or filters change
    void load();
  }, [load]);

  function search() {
    setPageNo(0);
    setTicked(new Set());
    setApplied({ nameOp, name, allLevels, pageType });
  }

  function reset() {
    setNameOp("contains");
    setName("");
    setAllLevels(false);
    setPageType("all");
    setPageNo(0);
    setTicked(new Set());
    setApplied({ nameOp: "contains", name: "", allLevels: false, pageType: "all" });
  }

  function run(ids: string[], act: "publish" | "unpublish" | "archive" | "delete") {
    if (ids.length === 0) return;
    if (act === "delete" && !window.confirm(`Delete ${ids.length} page${ids.length === 1 ? "" : "s"} and everything nested inside? This can't be undone.`)) return;
    start(async () => {
      try {
        const r = await bulkPageAction(ids, act);
        toast.success(`${r.done} page${r.done === 1 ? "" : "s"} updated${r.failed ? `, ${r.failed} could not be changed` : ""}`);
        setTicked(new Set());
        await load();
        router.refresh();
      } catch {
        toast.error("Could not do that.");
      }
    });
  }

  function ok() {
    const act = action as "publish" | "unpublish" | "archive" | "delete" | "";
    if (!act) return toast.error("Choose an action first.");
    const ids = scope === "selected" ? [...ticked] : rows.map((r) => r.id);
    if (ids.length === 0) return toast.error("Tick at least one page.");
    run(ids, act);
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const allTicked = rows.length > 0 && rows.every((r) => ticked.has(r.id));
  const sel = "h-8 rounded-md border border-input bg-transparent px-2 text-sm";

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        {parentId ? (
          <Link href={`/cms/${parentId}`} className="rounded bg-[#4a7d00] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            Parent page
          </Link>
        ) : (
          <span />
        )}
        <label className="flex items-center gap-2 text-[#26688a]">
          <span className="font-semibold">Page type:</span>
          <select className={sel} value={pageType} onChange={(e) => setPageType(e.target.value as PageTypeFilter)}>
            {PAGE_TYPE_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="font-semibold text-[#26688a]">Name:</span>
        <select className={sel} value={nameOp} onChange={(e) => setNameOp(e.target.value as Op)}>
          <option value="contains">Contains</option>
          <option value="equals">Equals</option>
          <option value="startsWith">Starts with</option>
        </select>
        <Input className="h-8 max-w-xs" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} />
        <label className="flex items-center gap-2 text-[#26688a]">
          <span className="font-semibold">Show all levels:</span>
          <input type="checkbox" checked={allLevels} onChange={(e) => setAllLevels(e.target.checked)} />
        </label>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
        <Button type="button" size="sm" onClick={search}>
          Search
        </Button>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full text-left">
          <thead className="bg-[#e5e5e5] text-xs font-bold text-[#262524]">
            <tr>
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={allTicked}
                  onChange={(e) => setTicked(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                  aria-label="Tick all pages on this screen"
                />
              </th>
              <th className="px-3 py-2">Actions</th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Page type</th>
              <th className="px-3 py-2">Children</th>
              <th className="px-3 py-2">Modified</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Version</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-400">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-neutral-400">
                  No pages match.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={ticked.has(r.id)}
                      onChange={(e) =>
                        setTicked((cur) => {
                          const next = new Set(cur);
                          if (e.target.checked) next.add(r.id);
                          else next.delete(r.id);
                          return next;
                        })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Link href={`/cms/${r.id}`} title="Edit" className="text-[#4a7d00] hover:opacity-75">
                        <Pencil className="size-4" />
                      </Link>
                      {canEdit && (
                        <button type="button" title="Delete" className="text-red-700 hover:opacity-75" onClick={() => run([r.id], "delete")}>
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/cms/${r.id}`} className="inline-flex items-center gap-2 text-[#26688a] hover:underline">
                      {r.title}
                      <StatusDot status={r.status as PageStatus} />
                    </Link>
                    {r.linked && <span className="ml-2 text-xs text-neutral-400">(link)</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.pageType}</td>
                  <td className={`px-3 py-2 ${r.hasChildren ? "text-green-700" : "text-red-700"}`}>{r.hasChildren ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.modifiedAt)}</td>
                  <td className={`px-3 py-2 ${r.published ? "text-green-700" : "text-red-700"}`}>{r.published ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{r.version ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <select className={sel} value={scope} onChange={(e) => setScope(e.target.value as "selected" | "all")}>
              <option value="selected">Selected pages</option>
              <option value="all">All pages on this screen</option>
            </select>
            <select className={sel} value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">(select an action)</option>
              <option value="publish">Publish</option>
              <option value="unpublish">Unpublish</option>
              <option value="archive">Archive</option>
              <option value="delete">Delete</option>
            </select>
            <Button type="button" size="sm" disabled={pending} onClick={ok}>
              {pending ? "Working..." : "OK"}
            </Button>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="text-neutral-500">
            {total === 0 ? "0" : `${pageNo * pageSize + 1}-${Math.min(total, (pageNo + 1) * pageSize)}`} of {total}
          </span>
          <Button type="button" variant="outline" size="sm" disabled={pageNo === 0} onClick={() => setPageNo((p) => p - 1)}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={pageNo + 1 >= pages} onClick={() => setPageNo((p) => p + 1)}>
            Next
          </Button>
          <label className="flex items-center gap-2 text-neutral-500">
            Items per page
            <select
              className={sel}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPageNo(0);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
