import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ItineraryBuilder } from "@/components/plan/itinerary-builder";
import { sanitiseItinerary } from "../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const row = await prisma.itinerary.findUnique({ where: { token }, select: { title: true } });
  return { title: row ? `${row.title} | My Somerset itinerary` : "Itinerary", robots: { index: false } };
}

// A shared itinerary: anyone with the link can open it, change their own
// copy and save it under a new link.
export default async function SharedItineraryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await prisma.itinerary.findUnique({ where: { token } });
  if (!row) notFound();
  let data: unknown = null;
  try {
    data = JSON.parse(row.data);
  } catch {
    notFound();
  }
  const it = await sanitiseItinerary(data);
  return <ItineraryBuilder initial={it} token={null} />;
}
