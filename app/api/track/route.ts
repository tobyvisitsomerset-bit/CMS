import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Counts a click on a listing's website / booking / phone / email / directions.
// Only real listings are counted, one counter per page, kind and day.

const KINDS = new Set(["web", "booking", "phone", "email", "directions"]);
const BOT = /bot|crawl|spider|slurp|preview|headless|monitor|curl|wget/i;

export async function POST(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  let body: { pageId?: unknown; kind?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const pageId = typeof body.pageId === "string" ? body.pageId.slice(0, 40) : "";
  const kind = typeof body.kind === "string" ? body.kind : "";
  if (!pageId || !KINDS.has(kind)) return new NextResponse(null, { status: 400 });

  const page = await prisma.page.findFirst({ where: { id: pageId, status: "PUBLISHED" }, select: { id: true } });
  if (!page) return new NextResponse(null, { status: 404 });

  const day = new Date().toISOString().slice(0, 10);
  try {
    await prisma.clickCount.upsert({
      where: { pageId_kind_day: { pageId, kind, day } },
      create: { pageId, kind, day, clicks: 1 },
      update: { clicks: { increment: 1 } },
    });
  } catch {
    /* counting must never fail loudly */
  }
  return new NextResponse(null, { status: 204 });
}
