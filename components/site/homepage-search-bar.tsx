"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "stay", label: "Stay", action: "/places-to-stay", button: "Search stays" },
  { key: "do", label: "Things to do", action: "/things-to-do", button: "Search things to do" },
  { key: "eat", label: "Eat & drink", action: "/things-to-do/food-drink-more", button: "Search food & drink" },
  { key: "events", label: "What's on", action: "/festivals-events", button: "Search events" },
] as const;

const FIELD = "rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-left";
const LABEL = "block text-[11px] font-medium text-stone-500";
const INPUT = "w-full bg-transparent text-sm font-semibold text-stone-900 placeholder:text-stone-400 focus:outline-none";

// The hero search panel from the mockup pack. Every tab submits a real GET
// to the matching real landing page, which filters its real listings by the
// params. On the Stay tab the dates/guests are carried through to each
// listing's enquiry form — there is no live availability engine, and nothing
// here pretends otherwise.
export function HomepageSearchBar() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("stay");
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <form action={active.action} method="GET" className="w-full rounded-[2rem] bg-white p-4 text-stone-900 shadow-2xl sm:p-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
              tab === t.key ? "border-somerset-green bg-somerset-green text-white" : "border-stone-200 text-stone-700 hover:border-somerset-green",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={cn("mt-4 grid gap-3", tab === "stay" ? "md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]" : tab === "events" ? "md:grid-cols-[1.5fr_1fr_auto]" : "md:grid-cols-[1fr_auto]")}>
        <label className={FIELD}>
          <span className={LABEL}>Where</span>
          <input type="text" name="q" placeholder="Anywhere in Somerset" className={INPUT} />
        </label>
        {tab === "stay" && (
          <>
            <label className={FIELD}>
              <span className={LABEL}>Check in</span>
              <input type="date" name="checkin" className={INPUT} />
            </label>
            <label className={FIELD}>
              <span className={LABEL}>Check out</span>
              <input type="date" name="checkout" className={INPUT} />
            </label>
            <label className={FIELD}>
              <span className={LABEL}>Guests</span>
              <input type="text" name="guests" placeholder="2 adults" className={INPUT} />
            </label>
          </>
        )}
        {tab === "events" && (
          <label className={FIELD}>
            <span className={LABEL}>When</span>
            <select name="when" defaultValue="" className={INPUT}>
              <option value="">Any date</option>
              <option value="weekend">This weekend</option>
              <option value="week">Next 7 days</option>
            </select>
          </label>
        )}
        <button
          type="submit"
          className="rounded-full bg-somerset-green px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
        >
          {active.button}
        </button>
      </div>
    </form>
  );
}
