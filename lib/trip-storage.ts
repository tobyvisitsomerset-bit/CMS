// Trip data lives entirely on the visitor's device — no login, no server
// storage. Every function here is safe to import from anywhere (server or
// client) since the `typeof window` guard makes it a no-op during SSR/RSC
// render; only client components actually read/write real data.
//
// Exposes a small pub-sub (subscribe/getSnapshot) so `lib/trip-context.tsx`
// can drive its state via `useSyncExternalStore` — the correct pattern for
// synchronizing React with an external system like localStorage.
//
// Phase 12: from one flat list to several named trips, each with places
// optionally pinned to a day (the mockup pack's "My trip, day by day").
// Version 1 data (a flat array under "vs-trip-planner") is migrated in place.

export type TripItem = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  addedAt: number;
  /** YYYY-MM-DD, or null/undefined for "unplaced". */
  day?: string | null;
  note?: string;
};

export type Trip = {
  id: string;
  name: string;
  createdAt: number;
  startDate?: string | null;
  endDate?: string | null;
  guests?: string | null;
  items: TripItem[];
};

export type TripStore = { activeTripId: string; trips: Trip[] };

const STORAGE_KEY = "vs-trip-v2";
const LEGACY_KEY = "vs-trip-planner";
const DEFAULT_TRIP_ID = "my-trip";

const EMPTY_STORE: TripStore = {
  activeTripId: DEFAULT_TRIP_ID,
  trips: [{ id: DEFAULT_TRIP_ID, name: "My trip", createdAt: 0, items: [] }],
};

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedStore: TripStore = EMPTY_STORE;

function notify(): void {
  for (const listener of listeners) listener();
}

function uid(): string {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function normalise(value: unknown): TripStore {
  const v = value as Partial<TripStore> | null;
  if (!v || !Array.isArray(v.trips) || v.trips.length === 0) return EMPTY_STORE;
  const trips = v.trips
    .filter((t) => t && typeof t.id === "string")
    .map((t) => ({ ...t, name: t.name || "My trip", items: Array.isArray(t.items) ? t.items : [] }));
  if (trips.length === 0) return EMPTY_STORE;
  const activeTripId = trips.some((t) => t.id === v.activeTripId) ? (v.activeTripId as string) : trips[0].id;
  return { activeTripId, trips };
}

function readLegacy(): TripStore | null {
  try {
    const raw = window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return {
      activeTripId: DEFAULT_TRIP_ID,
      trips: [{ id: DEFAULT_TRIP_ID, name: "My trip", createdAt: Date.now(), items: parsed }],
    };
  } catch {
    return null;
  }
}

function readStore(): TripStore {
  if (typeof window === "undefined") return EMPTY_STORE;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  // Keep a stable object reference when the underlying data hasn't changed,
  // since useSyncExternalStore re-renders whenever the snapshot reference differs.
  if (raw === cachedRaw) return cachedStore;
  cachedRaw = raw;
  if (raw) {
    try {
      cachedStore = normalise(JSON.parse(raw));
    } catch {
      cachedStore = EMPTY_STORE;
    }
  } else {
    cachedStore = readLegacy() ?? EMPTY_STORE;
  }
  return cachedStore;
}

function write(next: TripStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / quota exceeded — trip planning just won't persist
    // across reloads, not worth surfacing an error for.
  }
  cachedRaw = undefined; // force readStore() to re-parse on next read
  cachedStore = next;
  notify();
}

function mutateTrip(tripId: string | undefined, fn: (t: Trip) => Trip): TripStore {
  const store = readStore();
  const id = tripId ?? store.activeTripId;
  const next: TripStore = { ...store, trips: store.trips.map((t) => (t.id === id ? fn(t) : t)) };
  write(next);
  return next;
}

export function subscribeTripStore(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getTripStoreSnapshot(): TripStore {
  return readStore();
}

// Must return a referentially-stable value across calls, or
// useSyncExternalStore warns/loops during server rendering.
export function getTripStoreServerSnapshot(): TripStore {
  return EMPTY_STORE;
}

export function getActiveTrip(store: TripStore = readStore()): Trip {
  return store.trips.find((t) => t.id === store.activeTripId) ?? store.trips[0];
}

export function getTripItems(): TripItem[] {
  return getActiveTrip().items;
}

export function addTripItem(item: Omit<TripItem, "addedAt">, tripId?: string): TripItem[] {
  const store = readStore();
  const target = store.trips.find((t) => t.id === (tripId ?? store.activeTripId)) ?? getActiveTrip(store);
  if (target.items.some((i) => i.id === item.id)) {
    // Already there — just (re)pin the day if one was chosen.
    if (item.day !== undefined) {
      mutateTrip(target.id, (t) => ({ ...t, items: t.items.map((i) => (i.id === item.id ? { ...i, day: item.day } : i)) }));
    }
    return readStore().trips.find((t) => t.id === target.id)!.items;
  }
  const next = mutateTrip(target.id, (t) => ({ ...t, items: [...t.items, { ...item, addedAt: Date.now() }] }));
  return next.trips.find((t) => t.id === target.id)!.items;
}

export function removeTripItem(id: string, tripId?: string): void {
  if (tripId) {
    mutateTrip(tripId, (t) => ({ ...t, items: t.items.filter((i) => i.id !== id) }));
    return;
  }
  // From the heart toggle: remove from whichever trips hold it.
  const store = readStore();
  write({ ...store, trips: store.trips.map((t) => ({ ...t, items: t.items.filter((i) => i.id !== id) })) });
}

export function setItemDay(id: string, day: string | null, tripId?: string): void {
  mutateTrip(tripId, (t) => ({ ...t, items: t.items.map((i) => (i.id === id ? { ...i, day } : i)) }));
}

export function setItemNote(id: string, note: string, tripId?: string): void {
  mutateTrip(tripId, (t) => ({ ...t, items: t.items.map((i) => (i.id === id ? { ...i, note } : i)) }));
}

export function moveItem(id: string, direction: -1 | 1, tripId?: string): void {
  mutateTrip(tripId, (t) => {
    const idx = t.items.findIndex((i) => i.id === id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= t.items.length) return t;
    const items = [...t.items];
    [items[idx], items[swap]] = [items[swap], items[idx]];
    return { ...t, items };
  });
}

export function createTrip(name: string, extra: Partial<Pick<Trip, "startDate" | "endDate" | "guests">> = {}): string {
  const store = readStore();
  const trip: Trip = { id: uid(), name: name.trim() || "New trip", createdAt: Date.now(), items: [], ...extra };
  write({ activeTripId: trip.id, trips: [...store.trips, trip] });
  return trip.id;
}

export function updateTrip(tripId: string, patch: Partial<Pick<Trip, "name" | "startDate" | "endDate" | "guests">>): void {
  mutateTrip(tripId, (t) => ({ ...t, ...patch }));
}

export function deleteTrip(tripId: string): void {
  const store = readStore();
  const trips = store.trips.filter((t) => t.id !== tripId);
  if (trips.length === 0) {
    write(EMPTY_STORE);
    return;
  }
  write({ activeTripId: store.activeTripId === tripId ? trips[0].id : store.activeTripId, trips });
}

export function setActiveTrip(tripId: string): void {
  const store = readStore();
  if (store.trips.some((t) => t.id === tripId)) write({ ...store, activeTripId: tripId });
}

// Replace the store wholesale (used by undo).
export function restoreTripStore(snapshot: TripStore): void {
  write(normalise(snapshot));
}
