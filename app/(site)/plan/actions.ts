"use server";

import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getItineraryPool } from "@/lib/data/itinerary-pool";
import {
  MAX_DAYS,
  INTERESTS,
  generateItinerary,
  itineraryTitle,
  swapItem,
  type Itinerary,
  type PlanItem,
  type Prefs,
} from "@/lib/itinerary";
import { ACCESS_FEATURES } from "@/lib/accessibility";

// The planner works for anyone, signed in or not. Saving creates a shareable
// link; signed-in visitors also keep it in their account.

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function sanitisePrefs(raw: unknown, allowPast = false): Promise<Prefs> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const today = new Date().toISOString().slice(0, 10);
  let start = ISO.test(str(r.startDate, 10)) ? str(r.startDate, 10) : today;
  let end = ISO.test(str(r.endDate, 10)) ? str(r.endDate, 10) : start;
  if (end < start) end = start;
  const maxEnd = new Date(new Date(`${start}T12:00:00Z`).getTime() + (MAX_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  if (end > maxEnd) end = maxEnd;
  if (!allowPast && start < today) {
    start = today;
    if (end < start) end = start;
  }
  const accessKeys = new Set(ACCESS_FEATURES.map((f) => f.key as string));
  const interests = new Set(INTERESTS.map((i) => i.key));
  const budget = r.budget == null || r.budget === "" ? null : num(r.budget, 20, 20000, 0) || null;
  return {
    startDate: start,
    endDate: end,
    adults: num(r.adults, 1, 12, 2),
    children: num(r.children, 0, 12, 0),
    budget,
    dog: !!r.dog,
    access: Array.isArray(r.access) ? (r.access as unknown[]).filter((k): k is string => typeof k === "string" && accessKeys.has(k)) : [],
    interests: Array.isArray(r.interests) ? (r.interests as unknown[]).filter((k): k is string => typeof k === "string" && interests.has(k)) : [],
    pace: r.pace === "relaxed" || r.pace === "packed" ? r.pace : "balanced",
    area: str(r.area, 60) || null,
  };
}

export async function generateItineraryAction(rawPrefs: unknown): Promise<Itinerary> {
  const prefs = await sanitisePrefs(rawPrefs);
  const pool = await getItineraryPool();
  return generateItinerary(prefs, pool);
}

export async function swapItemAction(raw: unknown, itemUid: string): Promise<Itinerary> {
  const it = await sanitiseItinerary(raw);
  const pool = await getItineraryPool();
  return swapItem(it, pool, itemUid);
}

function cleanUrl(v: unknown): string | null {
  const s = str(v, 500);
  return /^(https:\/\/|\/)/.test(s) ? s : null;
}

function cleanItem(v: unknown): PlanItem | null {
  const r = (v && typeof v === "object" ? v : null) as Record<string, unknown> | null;
  if (!r) return null;
  const kind = r.kind;
  const slot = r.slot;
  if (!["stay", "do", "food", "event"].includes(String(kind))) return null;
  if (!["stay", "morning", "lunch", "afternoon", "evening"].includes(String(slot))) return null;
  const lat = Number(r.lat);
  const lng = Number(r.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    uid: str(r.uid, 40) || `i${Math.random().toString(36).slice(2)}`,
    id: str(r.id, 40),
    kind: kind as PlanItem["kind"],
    slot: slot as PlanItem["slot"],
    title: str(r.title, 160),
    slug: str(r.slug, 300),
    imageUrl: cleanUrl(r.imageUrl),
    town: str(r.town, 80) || null,
    lat,
    lng,
    priceText: str(r.priceText, 60) || null,
    note: str(r.note, 200) || null,
    access: Array.isArray(r.access) ? (r.access as unknown[]).filter((k): k is string => typeof k === "string").slice(0, 10) : [],
    bookingUrl: cleanUrl(r.bookingUrl),
    startDate: ISO.test(str(r.startDate, 10)) ? str(r.startDate, 10) : null,
    endDate: ISO.test(str(r.endDate, 10)) ? str(r.endDate, 10) : null,
  };
}

export async function sanitiseItinerary(raw: unknown): Promise<Itinerary> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const prefs = await sanitisePrefs(r.prefs, true);
  const days = Array.isArray(r.days) ? (r.days as unknown[]).slice(0, MAX_DAYS) : [];
  return {
    prefs,
    stay: cleanItem(r.stay),
    days: days.map((d) => {
      const dd = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
      const items = Array.isArray(dd.items) ? (dd.items as unknown[]).slice(0, 12).map(cleanItem).filter((i): i is PlanItem => !!i) : [];
      return { date: ISO.test(str(dd.date, 10)) ? str(dd.date, 10) : prefs.startDate, items };
    }),
    notes: Array.isArray(r.notes) ? (r.notes as unknown[]).filter((n): n is string => typeof n === "string").map((n) => n.slice(0, 300)).slice(0, 8) : [],
    skipped: Array.isArray(r.skipped) ? (r.skipped as unknown[]).filter((n): n is string => typeof n === "string").slice(0, 200) : [],
  };
}

export async function saveItineraryAction(raw: unknown, existingToken?: string | null): Promise<{ token: string; title: string }> {
  const it = await sanitiseItinerary(raw);
  const session = await auth();
  const title = itineraryTitle(it);
  const data = JSON.stringify(it);
  if (data.length > 200_000) throw new Error("This itinerary is too large to save.");

  // Anyone holding the token can edit that saved copy; a signed-in owner can too.
  if (existingToken) {
    const existing = await prisma.itinerary.findUnique({ where: { token: existingToken } });
    if (existing && (!existing.userId || existing.userId === session?.user?.id)) {
      await prisma.itinerary.update({
        where: { id: existing.id },
        data: { title, prefs: JSON.stringify(it.prefs), data, userId: existing.userId ?? session?.user?.id ?? null },
      });
      return { token: existing.token, title };
    }
  }
  const token = randomBytes(9).toString("base64url");
  await prisma.itinerary.create({
    data: { token, title, prefs: JSON.stringify(it.prefs), data, userId: session?.user?.id ?? null },
  });
  return { token, title };
}
