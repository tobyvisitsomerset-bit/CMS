"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { requestAdSpaceAction } from "@/app/portal/actions";
import { MIN_WEEKS_FOR_DISCOUNT, formatPence, totals } from "@/lib/ad-spaces";
import { cn } from "@/lib/utils";

type P = { key: string; label: string; pence: number; slots: number };

function weekLabel(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export function SpacesBooker({
  listings,
  weeks,
  placements,
  free,
  yours,
}: {
  listings: { id: string; title: string }[];
  weeks: string[];
  placements: P[];
  free: Record<string, Record<string, number>>;
  yours: Record<string, Record<string, boolean>>;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [listing, setListing] = useState(listings[0]?.id ?? "");
  const [po, setPo] = useState("");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ ref: string; total: number } | null>(null);

  const soldOutAll = (key: string) => weeks.every((w) => free[key][w] === 0);
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const t = useMemo(() => totals(pages, picked), [pages, picked]);
  const clash = pages.some((k) => picked.some((w) => free[k][w] === 0 && !yours[k][w]));

  function submit() {
    start(async () => {
      const res = await requestAdSpaceAction({ pageId: listing, placements: pages, weeks: picked, poNumber: po });
      if (res.ok) {
        setDone({ ref: res.ref, total: res.total });
        toast.success("Request sent");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (done) {
    return (
      <div className="mt-8 rounded-3xl bg-somerset-green p-8 text-white">
        <p className="font-serif text-3xl font-black">Space requested</p>
        <p className="mt-2 text-white/90">
          Reference {done.ref}. We hold these slots for you and the Visit Somerset team will confirm them and send an invoice
          ({formatPence(done.total)} including VAT).
        </p>
        <button type="button" onClick={() => { setDone(null); setPages([]); setPicked([]); }} className="mt-5 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-somerset-green">
          Book more space
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-10">
        <section>
          <h2 className="font-serif text-2xl font-black">1 · Choose your pages</h2>
          <p className="text-sm text-stone-500">Pick as many as you like. Rates vary by traffic.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {placements.map((p) => {
              const out = soldOutAll(p.key);
              const on = pages.includes(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  disabled={out}
                  onClick={() => setPages((c) => toggle(c, p.key))}
                  className={cn(
                    "flex items-center gap-3 rounded-3xl border p-4 text-left",
                    on ? "border-somerset-green ring-2 ring-somerset-green/30" : "border-stone-200",
                    out && "cursor-not-allowed bg-stone-100 opacity-60",
                  )}
                >
                  <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md border", on ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300")}>
                    {on && <Check className="size-4" />}
                  </span>
                  <span className="flex-1">
                    <span className="block font-serif text-lg font-black">{p.label}</span>
                    <span className="block text-xs text-stone-500">{out ? "Sold out for the next 8 weeks" : `${p.slots} slots a week`}</span>
                  </span>
                  <span className="text-right">
                    <span className="block font-serif text-lg font-black">{formatPence(p.pence)}</span>
                    <span className="block text-xs text-stone-500">per week</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="font-serif text-2xl font-black">2 · Choose your weeks</h2>
          <p className="text-sm text-stone-500">
            Minimum one week, Monday to Sunday. Book {MIN_WEEKS_FOR_DISCOUNT} or more weeks for 15% off.
          </p>
          <div className="mt-4 overflow-x-auto rounded-3xl border border-stone-200 bg-white">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-xs tracking-wider text-stone-500 uppercase">
                  <th className="p-3">Week commencing</th>
                  {placements.map((p) => (
                    <th key={p.key} className="p-3">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => {
                  const on = picked.includes(w);
                  return (
                    <tr key={w} className={cn("border-b border-stone-100", on && "bg-somerset-green/5")}>
                      <td className="p-3">
                        <label className="flex cursor-pointer items-center gap-2 font-semibold">
                          <input type="checkbox" checked={on} onChange={() => setPicked((c) => toggle(c, w))} className="size-4 accent-[#3d685b]" />
                          {weekLabel(w)}
                        </label>
                      </td>
                      {placements.map((p) => {
                        const n = free[p.key][w];
                        const mine = yours[p.key][w];
                        return (
                          <td key={p.key} className="p-3">
                            {mine ? (
                              <span className="rounded-full bg-somerset-green px-2.5 py-0.5 text-xs font-semibold text-white">Yours</span>
                            ) : n === 0 ? (
                              <span className="text-xs text-stone-400">Sold out</span>
                            ) : n === 1 ? (
                              <span className="rounded-full bg-damson/10 px-2.5 py-0.5 text-xs font-semibold text-damson">1 left</span>
                            ) : (
                              <span className="text-xs text-stone-600">{n} free</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">Your booking</p>
          {t.lines.length === 0 || picked.length === 0 ? (
            <p className="mt-3 text-sm text-stone-500">Choose at least one page and one week.</p>
          ) : (
            <>
              <ul className="mt-3 space-y-2">
                {t.lines.map((l) => (
                  <li key={l.placement.key} className="flex justify-between rounded-2xl bg-stone-100 px-4 py-2.5 text-sm">
                    <span>
                      <strong>{l.placement.label}</strong>
                      <span className="block text-xs text-stone-500">
                        {picked.length} week{picked.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="font-serif font-black">{formatPence(l.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{formatPence(t.subtotal)}</span></div>
                {t.discount > 0 && (
                  <div className="flex justify-between text-somerset-green"><span>{MIN_WEEKS_FOR_DISCOUNT}+ weeks discount, 15%</span><span>-{formatPence(t.discount)}</span></div>
                )}
                <div className="flex justify-between"><span>VAT at 20%</span><span>{formatPence(t.vat)}</span></div>
                <div className="flex justify-between border-t border-stone-200 pt-2 font-serif text-xl font-black"><span>Total</span><span>{formatPence(t.total)}</span></div>
              </div>
            </>
          )}

          <label className="mt-4 block text-sm font-semibold text-stone-700">Listing to promote</label>
          <select value={listing} onChange={(e) => setListing(e.target.value)} className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
          <label className="mt-3 block text-sm font-semibold text-stone-700">Purchase order reference (optional)</label>
          <input value={po} onChange={(e) => setPo(e.target.value)} maxLength={60} className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm" />

          {clash && <p className="mt-3 text-xs text-damson">Some of the weeks you picked are sold out for a page you chose. Choose other weeks.</p>}
          <button
            type="button"
            disabled={pending || pages.length === 0 || picked.length === 0 || clash}
            onClick={submit}
            className="mt-4 w-full rounded-full bg-damson px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            Request this space
          </button>
          <p className="mt-2 text-xs text-stone-500">
            We hold the slots, confirm them and send a VAT invoice. Card payment is not available yet.
          </p>
        </div>
      </aside>
    </div>
  );
}
