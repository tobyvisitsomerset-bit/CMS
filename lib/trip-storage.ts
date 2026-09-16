// Trip data lives entirely on the visitor's device — no login, no server
// storage. Every function here is safe to import from anywhere (server or
// client) since the `typeof window` guard makes it a no-op during SSR/RSC
// render; only client components actually read/write real data.
//
// Exposes a small pub-sub (subscribe/getSnapshot) so `lib/trip-context.tsx`
// can drive its state via `useSyncExternalStore` — the correct pattern for
// synchronizing React with an external system like localStorage, rather
// than writing into state from inside a useEffect.

export type TripItem = {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  addedAt: number;
};

const STORAGE_KEY = "vs-trip-planner";
const EMPTY_ITEMS: TripItem[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedItems: TripItem[] = EMPTY_ITEMS;

function notify(): void {
  for (const listener of listeners) listener();
}

function parse(raw: string | null): TripItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readRaw(): TripItem[] {
  if (typeof window === "undefined") return EMPTY_ITEMS;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  // Keep a stable array reference when the underlying data hasn't changed,
  // since useSyncExternalStore re-renders whenever the snapshot reference differs.
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = parse(raw);
  return cachedItems;
}

function writeRaw(items: TripItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Private browsing / quota exceeded — trip planning just won't persist
    // across reloads, not worth surfacing an error for.
  }
  cachedRaw = null; // force readRaw() to re-parse on next read
  notify();
}

export function subscribeTripItems(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getTripItemsSnapshot(): TripItem[] {
  return readRaw();
}

// Must return a referentially-stable value across calls, or
// useSyncExternalStore warns/loops during server rendering.
export function getTripItemsServerSnapshot(): TripItem[] {
  return EMPTY_ITEMS;
}

export function getTripItems(): TripItem[] {
  return readRaw();
}

export function hasTripItem(id: string): boolean {
  return readRaw().some((item) => item.id === id);
}

export function addTripItem(item: Omit<TripItem, "addedAt">): TripItem[] {
  const current = readRaw();
  if (current.some((i) => i.id === item.id)) return current;
  const next = [...current, { ...item, addedAt: Date.now() }];
  writeRaw(next);
  return next;
}

export function removeTripItem(id: string): TripItem[] {
  const next = readRaw().filter((item) => item.id !== id);
  writeRaw(next);
  return next;
}
