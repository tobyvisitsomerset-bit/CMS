"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlacementsPicker, type PlacementOption } from "@/components/cms/placements-picker";
import { savePlacementsAction } from "@/app/portal/actions";

// One listing: what it appears on now, and a simple tick-and-send picker.
export function AppearCard({
  id,
  title,
  level,
  cap,
  live,
  selected,
  waiting,
  home,
  options,
}: {
  id: string;
  title: string;
  level: string | null;
  cap: number;
  live: string[];
  selected: string[];
  waiting: boolean;
  home: string[];
  options: PlacementOption[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState<string[]>(selected);
  const [pending, start] = useTransition();

  const same = JSON.stringify([...ids].sort()) === JSON.stringify([...live].sort());
  const nameOf = (x: string) => options.find((o) => o.id === x)?.title ?? x;

  function send() {
    start(async () => {
      const res = await savePlacementsAction(id, ids);
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-xl font-black text-stone-900">{title}</h2>
        {level && <span className="rounded-full bg-damson/10 px-3 py-1 text-xs font-bold text-damson">{level} member</span>}
      </div>

      <p className="mt-2 text-sm text-stone-600">
        {live.length === 0 ? (
          <>Not on any extra landing pages yet.</>
        ) : (
          <>
            Showing now on: <strong className="text-stone-900">{live.map(nameOf).join(", ")}</strong>
          </>
        )}
      </p>

      {waiting && (
        <p className="mt-3 rounded-2xl border border-damson/30 bg-damson/5 p-3 text-sm text-stone-800">
          Your last choices are with the team for approval. If you send again they are replaced by this version.
        </p>
      )}

      <div className="mt-4">
        {cap === 0 ? (
          <p className="rounded-2xl bg-cool-grey p-4 text-sm text-stone-700">
            Extra landing pages come with a membership level.{" "}
            <Link href="/portal/membership" className="font-semibold text-somerset-green hover:underline">
              See the levels
            </Link>
          </p>
        ) : (
          <PlacementsPicker options={options} selected={ids} onChange={setIds} cap={cap} homeIds={home} />
        )}
      </div>

      {cap > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending || same}
            onClick={send}
            className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Sending..." : "Send for approval"}
          </button>
          {!same && (
            <button type="button" onClick={() => setIds(live)} className="text-sm font-medium text-stone-500 hover:text-stone-900 hover:underline">
              Undo my changes
            </button>
          )}
          {same && <span className="text-xs text-stone-500">Nothing changed.</span>}
        </div>
      )}
    </section>
  );
}
