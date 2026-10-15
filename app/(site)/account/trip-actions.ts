"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Trip, TripItem, TripStore } from "@/lib/trip-storage";

// A signed-in visitor's My Trip, saved so it follows them to other devices.

const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function clean(raw: unknown): TripStore | null {
  const r = (raw && typeof raw === "object" ? raw : null) as { activeTripId?: unknown; trips?: unknown } | null;
  if (!r || !Array.isArray(r.trips)) return null;
  const trips: Trip[] = (r.trips as unknown[])
    .slice(0, 20)
    .map((t): Trip | null => {
      const x = (t && typeof t === "object" ? t : null) as Record<string, unknown> | null;
      if (!x || typeof x.id !== "string") return null;
      const items: TripItem[] = (Array.isArray(x.items) ? (x.items as unknown[]) : [])
        .slice(0, 200)
        .map((i): TripItem | null => {
          const y = (i && typeof i === "object" ? i : null) as Record<string, unknown> | null;
          if (!y || typeof y.id !== "string" || typeof y.slug !== "string") return null;
          return {
            id: s(y.id, 40),
            title: s(y.title, 200),
            slug: s(y.slug, 300),
            heroImageUrl: typeof y.heroImageUrl === "string" ? s(y.heroImageUrl, 500) : null,
            addedAt: Number(y.addedAt) || Date.now(),
            day: date(y.day),
            note: s(y.note, 500),
          };
        })
        .filter((i): i is TripItem => !!i);
      return {
        id: s(x.id, 40),
        name: s(x.name, 80) || "My trip",
        createdAt: Number(x.createdAt) || 0,
        startDate: date(x.startDate),
        endDate: date(x.endDate),
        guests: typeof x.guests === "string" ? s(x.guests, 80) : null,
        items,
      };
    })
    .filter((t): t is Trip => !!t);
  if (trips.length === 0) return null;
  const active = typeof r.activeTripId === "string" && trips.some((t) => t.id === r.activeTripId) ? (r.activeTripId as string) : trips[0].id;
  return { activeTripId: active, trips };
}

export async function getTripsAction(): Promise<TripStore | null> {
  const session = await auth();
  if (!session?.user) return null;
  const row = await prisma.userTrips.findUnique({ where: { userId: session.user.id } });
  if (!row) return null;
  try {
    return clean(JSON.parse(row.data));
  } catch {
    return null;
  }
}

export async function saveTripsAction(raw: unknown): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session?.user) return { ok: false };
  const store = clean(raw);
  if (!store) return { ok: false };
  const data = JSON.stringify(store);
  if (data.length > 400_000) return { ok: false };
  await prisma.userTrips.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, data },
    update: { data },
  });
  return { ok: true };
}
