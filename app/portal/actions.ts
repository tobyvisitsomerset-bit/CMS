"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifySubmittedForReview } from "@/lib/data/notifications";
import { diffProposal, keepUnchanged, proposalFromPage, sanitiseProposal, saveRequest, withdrawRequest } from "@/lib/data/change-requests";

// Everything a member does here is scoped to pages assigned to them, and
// nothing in this file changes a live page: edits become a ChangeRequest that
// a member of the team approves.

async function requireMember() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  if (session.user.roleKey !== "MEMBER") throw new Error("Members only");
  return session;
}

async function ownedPage(pageId: string, userId: string) {
  const page = await prisma.page.findFirst({
    where: { id: pageId, assignedMemberId: userId },
    include: { rooms: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) throw new Error("Not permitted");
  return page;
}

export type ChangeResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveChangeAction(pageId: string, raw: unknown, submit: boolean): Promise<ChangeResult> {
  const session = await requireMember();
  const page = await ownedPage(pageId, session.user.id);
  const live = proposalFromPage(page);
  const proposal = keepUnchanged(sanitiseProposal(raw), live);

  const changes = diffProposal(live, proposal);
  if (submit && changes.length === 0) {
    return { ok: false, error: "You haven't changed anything yet, so there is nothing to send for approval." };
  }

  await saveRequest(pageId, session.user.id, proposal, submit);
  if (submit) {
    await notifySubmittedForReview(page.title, pageId, session.user.name ?? "A member");
    await logAudit({
      userId: session.user.id,
      pageId,
      action: "submitted",
      details: `Member edit: ${changes.map((c) => c.label).join(", ")}`,
    });
  }
  revalidatePath("/portal", "layout");
  revalidatePath("/cms/approvals");
  return {
    ok: true,
    message: submit
      ? "Sent to the Visit Somerset team for approval. Your live page stays as it is until they approve it."
      : "Draft saved. It is not visible to anyone else until you send it for approval.",
  };
}

export async function withdrawChangeAction(pageId: string): Promise<ChangeResult> {
  const session = await requireMember();
  await ownedPage(pageId, session.user.id);
  await withdrawRequest(pageId, session.user.id);
  revalidatePath("/portal", "layout");
  revalidatePath("/cms/approvals");
  return { ok: true, message: "Your pending changes were discarded." };
}

export async function setEnquiryHandledAction(id: string, handled: boolean) {
  const session = await requireMember();
  const enquiry = await prisma.bookingRequest.findUnique({ where: { id }, select: { pageId: true } });
  if (!enquiry) throw new Error("Not found");
  await ownedPage(enquiry.pageId, session.user.id);
  await prisma.bookingRequest.update({ where: { id }, data: { status: handled ? "HANDLED" : "NEW" } });
  revalidatePath("/portal", "layout");
}

export async function markNotificationsReadAction() {
  const session = await requireMember();
  await prisma.notification.updateMany({ where: { userId: session.user.id, read: false }, data: { read: true } });
  revalidatePath("/portal", "layout");
}

export type PasswordResult = { ok: true } | { ok: false; error: string };

export async function changePasswordAction(_prev: PasswordResult | null, formData: FormData): Promise<PasswordResult> {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 10) return { ok: false, error: "Use at least 10 characters for the new password." };
  if (next !== confirm) return { ok: false, error: "The two new passwords do not match." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) {
    return { ok: false, error: "Your current password is not right." };
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true };
}
