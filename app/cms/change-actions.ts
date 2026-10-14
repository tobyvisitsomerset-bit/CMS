"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as versionsData from "@/lib/data/versions";
import { notifyChangeDecision } from "@/lib/data/notifications";
import { applyProposal, parseProposal } from "@/lib/data/change-requests";

// Staff review of member-submitted edits. Approving applies the proposal to
// the live page, snapshots a version (so it can be rolled back) and tells the
// member. Rejecting leaves the live page untouched.

async function requireReviewer() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!hasCapability(session.user.roleKey, "workflow.review")) throw new Error("Not permitted");
  return session;
}

function refresh(slug: string | null) {
  revalidatePath("/cms", "layout");
  revalidatePath("/portal", "layout");
  if (slug) revalidatePath(`/${slug}`);
}

export async function approveChangeAction(requestId: string) {
  const session = await requireReviewer();
  const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "SUBMITTED") throw new Error("This request is no longer waiting for review");
  const proposal = parseProposal(request.proposal);
  if (!proposal) throw new Error("The proposed changes could not be read");

  const page = await prisma.page.findUnique({ where: { id: request.pageId }, select: { title: true, slug: true } });
  if (!page) throw new Error("Page not found");

  await applyProposal(request.pageId, proposal);
  await prisma.changeRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date(), note: null },
  });
  await versionsData.createVersionSnapshot(request.pageId, session.user.id, "Member edit approved");
  await logAudit({ userId: session.user.id, pageId: request.pageId, action: "approved", details: "Member edit approved" });
  await notifyChangeDecision(request.authorId, page.title, request.pageId, true);
  refresh(page.slug);
}

export async function rejectChangeAction(requestId: string, note: string) {
  const session = await requireReviewer();
  const request = await prisma.changeRequest.findUnique({ where: { id: requestId } });
  if (!request || request.status !== "SUBMITTED") throw new Error("This request is no longer waiting for review");
  const reason = note.trim().slice(0, 500);
  if (!reason) throw new Error("Please give the member a short reason");

  const page = await prisma.page.findUnique({ where: { id: request.pageId }, select: { title: true, slug: true } });
  if (!page) throw new Error("Page not found");

  await prisma.changeRequest.update({
    where: { id: requestId },
    data: { status: "REJECTED", note: reason, decidedById: session.user.id, decidedAt: new Date() },
  });
  await logAudit({ userId: session.user.id, pageId: request.pageId, action: "rejected", details: `Member edit: ${reason}` });
  await notifyChangeDecision(request.authorId, page.title, request.pageId, false, reason);
  refresh(null);
}
