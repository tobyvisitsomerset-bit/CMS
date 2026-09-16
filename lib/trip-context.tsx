"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import {
  addTripItem,
  getTripItemsServerSnapshot,
  getTripItemsSnapshot,
  removeTripItem,
  subscribeTripItems,
  type TripItem,
} from "./trip-storage";

type TripContextValue = {
  items: TripItem[];
  count: number;
  has: (id: string) => boolean;
  add: (item: Omit<TripItem, "addedAt">) => void;
  remove: (id: string) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  // Synchronizes with localStorage as an external system — server render
  // and first client paint both see an empty list (real data only exists
  // on the device), then automatically re-renders whenever the store
  // changes, whether from this tab (add/remove) or a merged shared link.
  const items = useSyncExternalStore(subscribeTripItems, getTripItemsSnapshot, getTripItemsServerSnapshot);

  const has = useCallback((id: string) => items.some((item) => item.id === id), [items]);
  const add = useCallback((item: Omit<TripItem, "addedAt">) => {
    addTripItem(item);
  }, []);
  const remove = useCallback((id: string) => {
    removeTripItem(id);
  }, []);

  return <TripContext.Provider value={{ items, count: items.length, has, add, remove }}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
