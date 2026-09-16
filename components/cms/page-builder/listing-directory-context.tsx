"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ListingCategory } from "@prisma/client";
import { isFeaturedTier, type ListingWithFacilities } from "@/lib/data/listings";

export type SortKey = "recommended" | "rating" | "price" | "name";

type FacilityChip = { id: string; name: string; count: number };

export type QuickFilterKey = "this-month" | "next-month" | "this-weekend" | "free";

type ListingDirectoryValue = {
  category: ListingCategory;
  searchText: string;
  setSearchText: (value: string) => void;
  activeFacilityIds: Set<string>;
  toggleFacility: (id: string) => void;
  activeQuickFilters: Set<QuickFilterKey>;
  toggleQuickFilter: (key: QuickFilterKey) => void;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  chipCandidates: FacilityChip[];
  featured: ListingWithFacilities | null;
  visibleRest: ListingWithFacilities[];
  totalMatches: number;
  hasMore: boolean;
  loadMore: () => void;
};

function matchesQuickFilter(item: ListingWithFacilities, key: QuickFilterKey, now: Date): boolean {
  if (key === "free") return item.priceLabel == null;

  const start = item.startDate ? new Date(item.startDate) : null;
  const end = item.endDate ? new Date(item.endDate) : start;
  if (!start) return false;

  if (key === "this-weekend") {
    const day = now.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    const saturday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday);
    const sundayEnd = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 2);
    return start < sundayEnd && (end ?? start) >= saturday;
  }

  const monthOffset = key === "next-month" ? 1 : 0;
  const rangeStart = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return start < rangeEnd && (end ?? start) >= rangeStart;
}

const ListingDirectoryContext = createContext<ListingDirectoryValue | null>(null);

function parsePriceValue(priceLabel: string | null): number {
  const match = priceLabel?.match(/[\d,]+(\.\d+)?/);
  if (!match) return Number.POSITIVE_INFINITY;
  return parseFloat(match[0].replace(/,/g, ""));
}

const PAGE_SIZE = 6;

export function ListingDirectoryProvider({
  items,
  category,
  children,
}: {
  items: ListingWithFacilities[];
  category: ListingCategory;
  children: React.ReactNode;
}) {
  const [searchText, setSearchText] = useState("");
  const [activeFacilityIds, setActiveFacilityIds] = useState<Set<string>>(new Set());
  const [activeQuickFilters, setActiveQuickFilters] = useState<Set<QuickFilterKey>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("recommended");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const toggleFacility = (id: string) => {
    setVisibleCount(PAGE_SIZE);
    setActiveFacilityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleQuickFilter = (key: QuickFilterKey) => {
    setVisibleCount(PAGE_SIZE);
    setActiveQuickFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const chipCandidates = useMemo<FacilityChip[]>(() => {
    const counts = new Map<string, FacilityChip>();
    for (const item of items) {
      for (const facility of item.facilities) {
        const existing = counts.get(facility.id);
        if (existing) existing.count += 1;
        else counts.set(facility.id, { id: facility.id, name: facility.name, count: 1 });
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [items]);

  const filteredSorted = useMemo(() => {
    const text = searchText.trim().toLowerCase();
    const now = new Date();
    let result = items.filter((item) => {
      if (text) {
        const haystack = `${item.name} ${item.summary ?? ""}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      if (activeFacilityIds.size > 0) {
        const itemFacilityIds = new Set(item.facilities.map((f) => f.id));
        for (const id of activeFacilityIds) {
          if (!itemFacilityIds.has(id)) return false;
        }
      }
      for (const key of activeQuickFilters) {
        if (!matchesQuickFilter(item, key, now)) return false;
      }
      return true;
    });

    result = [...result];
    if (sortKey === "rating") {
      result.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sortKey === "price") {
      result.sort((a, b) => parsePriceValue(a.priceLabel) - parsePriceValue(b.priceLabel));
    } else if (sortKey === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    // "recommended" keeps the incoming order, which callers already sort by
    // tier-then-sortOrder (or startDate for events) via getAllListingsGrouped().
    return result;
  }, [items, searchText, activeFacilityIds, activeQuickFilters, sortKey]);

  // "Featured member" placement doesn't apply to the chronological event calendar.
  const featured =
    category !== "EVENT" && sortKey === "recommended" && filteredSorted.length > 0 && isFeaturedTier(filteredSorted[0].membershipTier)
      ? filteredSorted[0]
      : null;
  const rest = featured ? filteredSorted.slice(1) : filteredSorted;
  const visibleRest = rest.slice(0, visibleCount);
  const hasMore = rest.length > visibleCount;

  const value: ListingDirectoryValue = {
    category,
    searchText,
    setSearchText: (v) => {
      setVisibleCount(PAGE_SIZE);
      setSearchText(v);
    },
    activeFacilityIds,
    toggleFacility,
    activeQuickFilters,
    toggleQuickFilter,
    sortKey,
    setSortKey: (key) => {
      setVisibleCount(PAGE_SIZE);
      setSortKey(key);
    },
    chipCandidates,
    featured,
    visibleRest,
    totalMatches: filteredSorted.length,
    hasMore,
    loadMore: () => setVisibleCount((c) => c + PAGE_SIZE),
  };

  return <ListingDirectoryContext.Provider value={value}>{children}</ListingDirectoryContext.Provider>;
}

export function useListingDirectory(): ListingDirectoryValue | null {
  return useContext(ListingDirectoryContext);
}
