"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A member says they are coming to a Visit Somerset event, or changes their mind.
export async function toggleRegistrationAction(
  eventId: string,
): Promise<{ ok: true; registered: boolean } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user || session.user.roleKey !== "MEMBER") return { ok: false, error: "Members only." };
  const userId = session.user.id;

  const ev = await prisma.vsEvent.findUnique({
    where: { id: eventId },
    select: { published: true, startsAt: true, capacity: true, _count: { select: { registrations: true } } },
  });
  if (!ev || !ev.published) return { ok: false, error: "That event is no longer available." };

  const existing = await prisma.vsEventRegistration.findUnique({ where: { eventId_userId: { eventId, userId } } });
  if (existing) {
    await prisma.vsEventRegistration.delete({ where: { id: existing.id } });
    revalidatePath("/portal/vs-events");
    return { ok: true, registered: false };
  }
  if (ev.startsAt.getTime() < Date.now()) return { ok: false, error: "This event has already started." };
  if (ev.capacity && ev._count.registrations >= ev.capacity) return { ok: false, error: "Sorry, this event is full." };
  await prisma.vsEventRegistration.create({ data: { eventId, userId } });
  revalidatePath("/portal/vs-events");
  return { ok: true, registered: true };
}
