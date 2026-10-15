import { prisma } from "@/lib/prisma";

// Simple, real view counting for member listings: one counter per page per day,
// bumped when the public page is rendered for a (non-bot) visitor.

const BOT = /bot|crawl|spider|slurp|preview|headless|monitor|curl|wget|facebookexternalhit/i;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function recordView(pageId: string, userAgent: string | null) {
  if (!userAgent || BOT.test(userAgent)) return;
  const day = today();
  try {
    await prisma.pageView.upsert({
      where: { pageId_day: { pageId, day } },
      create: { pageId, day, views: 1 },
      update: { views: { increment: 1 } },
    });
  } catch {
    // Counting must never break a page.
  }
}

export type DailyViews = { day: string; views: number };

export async function viewsByDay(pageIds: string[], days = 30): Promise<Record<string, DailyViews[]>> {
  if (pageIds.length === 0) return {};
  const since = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  const rows = await prisma.pageView.findMany({ where: { pageId: { in: pageIds }, day: { gte: since } } });
  const out: Record<string, DailyViews[]> = {};
  for (const id of pageIds) {
    const map = new Map(rows.filter((r) => r.pageId === id).map((r) => [r.day, r.views]));
    out[id] = Array.from({ length: days }, (_, i) => {
      const day = new Date(Date.now() - (days - 1 - i) * 86400000).toISOString().slice(0, 10);
      return { day, views: map.get(day) ?? 0 };
    });
  }
  return out;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
