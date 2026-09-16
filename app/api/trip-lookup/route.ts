import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_IDS = 50;

// Public, unauthenticated by design — resolves ids from a shared trip link
// (?add=a,b,c) into real page details. PUBLISHED-only is load-bearing: a
// shared link must never leak a DRAFT/archived page's existence.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("ids") ?? "";
  const ids = Array.from(new Set(raw.split(",").map((id) => id.trim()).filter(Boolean))).slice(0, MAX_IDS);

  if (ids.length === 0) return NextResponse.json({ items: [] });

  const items = await prisma.page.findMany({
    where: { id: { in: ids }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, heroImageUrl: true },
  });

  return NextResponse.json({ items });
}
