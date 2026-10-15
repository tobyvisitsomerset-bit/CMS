import type { Metadata } from "next";
import Link from "next/link";
import { getItineraryPool } from "@/lib/data/itinerary-pool";
import { ACCESS_FEATURES } from "@/lib/accessibility";
import { priorityOf } from "@/lib/membership";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Accessible Somerset",
  description: "Find places to stay, things to do, food and drink and events in Somerset by the access you need: wheelchair, step-free, hearing loop, accessible toilets and Blue Badge parking.",
};

const KINDS = [
  { key: "all", label: "Everything" },
  { key: "stay", label: "Places to stay" },
  { key: "do", label: "Things to do" },
  { key: "food", label: "Food and drink" },
  { key: "event", label: "Events" },
];

const PAGE_SIZE = 24;

function href(sp: Record<string, string | undefined>, over: Record<string, string | undefined>) {
  const next = { ...sp, ...over };
  if (!("page" in over)) delete next.page;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(next)) if (v) qs.set(k, v);
  const s = qs.toString();
  return s ? `/accessible-somerset?${s}` : "/accessible-somerset";
}

export default async function AccessibleSomersetPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const selected = (sp.access ?? "").split(",").filter(Boolean);
  const kind = KINDS.some((k) => k.key === sp.kind) ? (sp.kind as string) : "all";
  const page = Math.max(1, Number(sp.page) || 1);

  const pool = await getItineraryPool();
  const withAccess = pool.filter((i) => i.access.some((a) => a !== "dogFriendly"));
  const inKind = kind === "all" ? withAccess : withAccess.filter((i) => i.kind === kind);
  const matches = inKind
    .filter((i) => selected.every((a) => i.access.includes(a)))
    .sort((a, b) => priorityOf(b.level) - priorityOf(a.level) || a.title.localeCompare(b.title));
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));

  const counts = Object.fromEntries(ACCESS_FEATURES.map((f) => [f.key, inKind.filter((i) => i.access.includes(f.key)).length]));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">Accessible Somerset</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900 sm:text-5xl">Plan around what you need</h1>
      <p className="mt-2 max-w-2xl text-stone-600">
        Choose the access features that matter to you. Every place shown has told us it offers them. Please still check details with the
        venue before you travel.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <Link
            key={k.key}
            href={href(sp, { kind: k.key === "all" ? undefined : k.key })}
            scroll={false}
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold",
              kind === k.key ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white text-stone-700 hover:border-stone-900",
            )}
          >
            {k.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ACCESS_FEATURES.filter((f) => f.key !== "dogFriendly").map((f) => {
          const on = selected.includes(f.key);
          const next = on ? selected.filter((k) => k !== f.key) : [...selected, f.key];
          return (
            <Link
              key={f.key}
              href={href(sp, { access: next.join(",") || undefined })}
              scroll={false}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold",
                on ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 bg-white text-stone-700 hover:border-somerset-green",
              )}
            >
              {f.label} <span className="opacity-60">· {counts[f.key]}</span>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-stone-600">
        {matches.length.toLocaleString("en-GB")} place{matches.length === 1 ? "" : "s"}
        {selected.length > 0 ? " with all of these features" : " with accessibility information"}.
      </p>

      <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((i) => (
          <Link key={i.id} href={`/${i.slug}`} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white">
            {i.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={i.imageUrl} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-cool-grey text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                Photo · {i.title}
              </div>
            )}
            <div className="space-y-1.5 p-4">
              <p className="font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{i.title}</p>
              <p className="text-xs text-stone-500">{i.town ?? ""}</p>
              <div className="flex flex-wrap gap-1.5">
                {i.access
                  .filter((a) => a !== "dogFriendly")
                  .slice(0, 4)
                  .map((a) => (
                    <span key={a} className="rounded-full bg-somerset-green/10 px-2 py-0.5 text-[11px] font-semibold text-somerset-green">
                      {ACCESS_FEATURES.find((f) => f.key === a)?.short}
                    </span>
                  ))}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href(sp, { page: String(page - 1) })} className="rounded-full border border-stone-300 px-4 py-2 font-semibold hover:bg-stone-50">
              Previous
            </Link>
          )}
          <span className="text-stone-500">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={href(sp, { page: String(page + 1) })} className="rounded-full border border-stone-300 px-4 py-2 font-semibold hover:bg-stone-50">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
