"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { syncEventbrite } from "@/lib/eventbrite";

// Visit Somerset's own events for members (networking, training, webinars).

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  return session;
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function saveVsEventAction(input: {
  id?: string | null;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  location?: string;
  url?: string;
  capacity?: number | null;
  published?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireStaff();
  const title = clip(input.title, 200);
  if (!title) return { ok: false, error: "Please give the event a title." };
  const startsAt = new Date(input.startsAt);
  if (isNaN(startsAt.getTime())) return { ok: false, error: "Please choose when it starts." };
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && (isNaN(endsAt.getTime()) || endsAt < startsAt)) return { ok: false, error: "The end cannot be before the start." };
  const url = clip(input.url, 500);
  if (url && !/^https:\/\//.test(url)) return { ok: false, error: "The booking link must start with https://" };
  const capacity = input.capacity && input.capacity > 0 ? Math.min(100000, Math.round(input.capacity)) : null;

  const data = {
    title,
    description: clip(input.description, 4000) || null,
    startsAt,
    endsAt,
    location: clip(input.location, 200) || null,
    url: url || null,
    capacity,
    published: input.published !== false,
  };
  const row = input.id
    ? await prisma.vsEvent.update({ where: { id: input.id }, data })
    : await prisma.vsEvent.create({ data: { ...data, source: "manual" } });
  await logAudit({ userId: session.user.id, action: input.id ? "updated" : "created", details: `Member event: ${title}` });
  revalidatePath("/cms/vs-events");
  revalidatePath("/portal/vs-events");
  return { ok: true, id: row.id };
}

export async function deleteVsEventAction(id: string) {
  const session = await requireStaff();
  const ev = await prisma.vsEvent.delete({ where: { id } });
  await logAudit({ userId: session.user.id, action: "deleted", details: `Member event: ${ev.title}` });
  revalidatePath("/cms/vs-events");
  revalidatePath("/portal/vs-events");
}

export async function syncEventbriteAction() {
  await requireStaff();
  const res = await syncEventbrite();
  revalidatePath("/cms/vs-events");
  revalidatePath("/portal/vs-events");
  return res;
}
