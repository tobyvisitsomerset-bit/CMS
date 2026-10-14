"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import {
  addTripItem,
  createTrip,
  deleteTrip,
  getActiveTrip,
  getTripStoreServerSnapshot,
  getTripStoreSnapshot,
  moveItem,
  removeTripItem,
  restoreTripStore,
  setActiveTrip,
  setItemDay,
  setItemNote,
  subscribeTripStore,
  updateTrip,
  type Trip,
  type TripItem,
  type TripStore,
} from "./trip-storage";

type NewItem = Omit<TripItem, "addedAt">;

type TripContextValue = {
  store: TripStore;
  trips: Trip[];
  activeTrip: Trip;
  /** Items in the active trip. */
  items: TripItem[];
  /** Number of places in the active trip (drives the header pill). */
  count: number;
  /** True if the page is saved in any trip (drives the heart state). */
  has: (id: string) => boolean;
  add: (item: NewItem, tripId?: string) => void;
  remove: (id: string, tripId?: string) => void;
  setDay: (id: string, day: string | null, tripId?: string) => void;
  setNote: (id: string, note: string, tripId?: string) => void;
  move: (id: string, direction: -1 | 1, tripId?: string) => void;
  newTrip: (name: string, extra?: { startDate?: string | null; endDate?: string | null; guests?: string | null }) => string;
  editTrip: (tripId: string, patch: { name?: string; startDate?: string | null; endDate?: string | null; guests?: string | null }) => void;
  removeTrip: (tripId: string) => void;
  switchTrip: (tripId: string) => void;
  restore: (snapshot: TripStore) => void;
};

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ children }: { children: React.ReactNode }) {
  // Synchronizes with localStorage as an external system — server render
  // and first client paint both see an empty store (real data only exists
  // on the device), then automatically re-renders whenever the store
  // changes, whether from this tab or a merged shared link.
  const store = useSyncExternalStore(subscribeTripStore, getTripStoreSnapshot, getTripStoreServerSnapshot);

  const value = useMemo<TripContextValue>(() => {
    const activeTrip = getActiveTrip(store);
    const allIds = new Set(store.trips.flatMap((t) => t.items.map((i) => i.id)));
    return {
      store,
      trips: store.trips,
      activeTrip,
      items: activeTrip.items,
      count: activeTrip.items.length,
      has: (id: string) => allIds.has(id),
      add: (item, tripId) => void addTripItem(item, tripId),
      remove: (id, tripId) => removeTripItem(id, tripId),
      setDay: (id, day, tripId) => setItemDay(id, day, tripId),
      setNote: (id, note, tripId) => setItemNote(id, note, tripId),
      move: (id, direction, tripId) => moveItem(id, direction, tripId),
      newTrip: (name, extra) => createTrip(name, extra),
      editTrip: (tripId, patch) => updateTrip(tripId, patch),
      removeTrip: (tripId) => deleteTrip(tripId),
      switchTrip: (tripId) => setActiveTrip(tripId),
      restore: (snapshot) => restoreTripStore(snapshot),
    };
  }, [store]);

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within a TripProvider");
  return ctx;
}
