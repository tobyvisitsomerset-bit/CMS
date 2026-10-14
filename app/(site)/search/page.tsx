import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search | Visit Somerset",
  description: "Search places to stay, things to do, food & drink, events and pages across Somerset.",
};

type Scope = "all" | "stay" | "do" | "eat" | "events" | "pages";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "stay", label: "Places to stay" },
  { key: "do", label: "Things to do" },
  { key: "eat", label: "Food & drink" },
  { key: "events", label: "Events" },
  { key: "pages", label: "Pages" },
];

function scopeOf(slug: string, isBusiness: boolean): Scope {
  if (slug.startsWith("places-to-stay/")) return "stay";
  if (slug.startsWith("things-to-do/food-drink-more")) return "eat";
  if (slug.startsWith("festivals-events/")) return "events";
  if (slug.startsWith("things-to-do/")) return "do";
  return isBusiness ? "do" : "pages";
}

const SCOPE_LABEL: Record<Scope, string> = {
  all: "",
  stay: "Place to stay",
  do: "Thing to do",
  eat: "Food & drink",
  events: "Event",
  pages: "Page",
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const scope = (SCOPES.find((s) => s.key === sp.in)?.key ?? "all") as Scope;
  const placesOnly = sp.places === "1";

  let rows: {
    id: string;
    title: string;
    subtitle: string | null;
    slug: string;
    heroImageUrl: string | null;
    bodyContent: string | null;
    customFields: string | null;
  }[] = [];

  if (q.length >= 2) {
    rows = await prisma.page.findMany({
      where: {
        status: "PUBLISHED",
        linkedPageId: null,
        // Never surface Kentico's technical/utility pages in search.
        NOT: [{ slug: { startsWith: "site-content/" } }, { slug: { startsWith: "extranet" } }, { slug: { startsWith: "white-label" } }],
        ...(placesOnly ? { customFields: { contains: "sz.touristitem" } } : {}),
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { subtitle: { contains: q, mode: "insensitive" } },
          { bodyContent: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, title: true, subtitle: true, slug: true, heroImageUrl: true, bodyContent: true, customFields: true },
      take: 400,
    });
  }

  const lower = q.toLowerCase();
  const results = rows
    .map((r) => {
      const info = getBusinessInfo(parseCustomFields(r.customFields));
      const isBusiness = !!r.customFields?.includes("sz.touristitem");
      return {
        ...r,
        info,
        scope: scopeOf(r.slug, isBusiness),
        rank: r.title.toLowerCase().includes(lower) ? 0 : (r.subtitle ?? "").toLowerCase().includes(lower) ? 1 : 2,
      };
    })
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title));

  const counts = new Map<Scope, number>();
  for (const r of results) counts.set(r.scope, (counts.get(r.scope) ?? 0) + 1);
  const visible = (scope === "all" ? results : results.filter((r) => r.scope === scope)).slice(0, 60);

  const href = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string | undefined> = { q, in: scope === "all" ? undefined : scope, places: placesOnly ? "1" : undefined, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/search?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-serif text-4xl font-black tracking-tight text-stone-900 sm:text-5xl">Search Somerset</h1>
      <form action="/search" method="GET" className="mt-5 flex items-center gap-2 rounded-full border border-stone-300 bg-white px-5 py-2 shadow-sm focus-within:border-somerset-green">
        <Search className="size-5 text-stone-400" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search places, events, towns…"
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-stone-900 placeholder:text-stone-400 focus:outline-none"
        />
        <button type="submit" className="rounded-full bg-somerset-green px-5 py-2 text-sm font-bold text-white hover:opacity-90">
          Search
        </button>
      </form>

      {q.length < 2 ? (
        <p className="mt-8 text-stone-500">Type at least two letters to search.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2">
            {SCOPES.map((s) => {
              const n = s.key === "all" ? results.length : (counts.get(s.key) ?? 0);
              if (s.key !== "all" && n === 0) return null;
              return (
                <Link
                  key={s.key}
                  href={href({ in: s.key === "all" ? undefined : s.key })}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm font-semibold",
                    scope === s.key ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green",
                  )}
                >
                  {s.label} <span className="opacity-70">· {n}</span>
                </Link>
              );
            })}
          </div>

          <p className="mt-5 text-sm text-stone-500">
            {results.length.toLocaleString("en-GB")} {results.length === 1 ? "result" : "results"} for &ldquo;{q}&rdquo;
            {placesOnly && " — places only"}
            {results.length > 0 && (
              <>
                {" · "}
                <Link href={`/interactive-map?q=${encodeURIComponent(q)}`} className="font-semibold text-somerset-green hover:underline">
                  See them on the map
                </Link>
              </>
            )}
          </p>

          {visible.length === 0 ? (
            <div className="mt-6 rounded-3xl bg-cool-grey p-10 text-center">
              <p className="font-serif text-xl font-black text-stone-900">Nothing found</p>
              <p className="mt-1 text-sm text-stone-600">Try a different word, or browse by category.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link href="/places-to-stay" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">
                  Places to stay
                </Link>
                <Link href="/things-to-do" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">
                  Things to do
                </Link>
                <Link href="/festivals-events" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold">
                  Events
                </Link>
              </div>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {visible.map((r) => {
                const snippet = decodeKenticoText(r.bodyContent) ?? decodeKenticoText(r.subtitle);
                return (
                  <li key={r.id}>
                    <Link href={`/${r.slug}`} className="flex gap-4 rounded-3xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md">
                      <Img src={r.heroImageUrl} alt="" label="" className="size-20 shrink-0 rounded-2xl" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold tracking-wider text-somerset-green uppercase">
                          {[SCOPE_LABEL[r.scope], r.info?.town].filter(Boolean).join(" · ")}
                        </p>
                        <p className="font-serif text-lg leading-tight font-black text-stone-900">{r.title}</p>
                        {snippet && <p className="mt-1 line-clamp-2 text-sm text-stone-600">{snippet}</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
