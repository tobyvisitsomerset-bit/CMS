"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "places-to-stay", label: "Stay" },
  { key: "things-to-do", label: "Things to do" },
  { key: "food-and-drink", label: "Eat & drink" },
  { key: "festivals-and-events", label: "What's on" },
] as const;

// A real search — submits a genuine GET to the matching real hub page,
// which already has its own real client-side filter (Phase 2). No
// check-in/check-out/guest fields: no real availability engine exists
// anywhere in this app, and faking one would be a disguised fake feature.
export function HomepageSearchBar() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]["key"]>("places-to-stay");

  return (
    <form action={`/${activeTab}`} method="GET" className="w-full max-w-xl rounded-2xl bg-white p-3 shadow-lg sm:p-4">
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              activeTab === tab.key ? "bg-somerset-green text-white" : "text-stone-500 hover:bg-stone-100",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-stone-200 px-3 py-2.5">
        <Search className="size-4 shrink-0 text-stone-400" />
        <input
          type="text"
          name="q"
          placeholder="Where in Somerset?"
          className="w-full text-sm text-stone-700 placeholder:text-stone-400 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-damson px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          Search
        </button>
      </div>
    </form>
  );
}
