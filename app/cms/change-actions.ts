"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as versionsData from "@/lib/data/versions";
import { notifyChangeDecision } from "@/lib/data/notifications";
import { applyProposal, parseProposal } from "@/lib/data/change-requests";
import { createFromSubmission, parseData, titleOf, type SubmissionKind } from "@/lib/data/submissions";

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
  updateTag("listings");
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

  await applyProposal(request.pageId, proposal, session.user.id);
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

// ---------- New listings, events and offers ----------

export async function approveSubmissionAction(id: string) {
  const session = await requireReviewer();
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub || sub.status !== "SUBMITTED") throw new Error("This submission is no longer waiting for review");
  const kind = sub.kind as SubmissionKind;
  const data = parseData(kind, sub.data);

  const pageId = await createFromSubmission(kind, data, sub.authorId);
  await prisma.submission.update({
    where: { id },
    data: { status: "APPROVED", resultPageId: pageId, decidedById: session.user.id, decidedAt: new Date(), note: null },
  });
  const page = await prisma.page.findUnique({ where: { id: pageId }, select: { title: true, slug: true } });
  await versionsData.createVersionSnapshot(pageId, session.user.id, `Member ${kind.toLowerCase()} approved`);
  await logAudit({ userId: session.user.id, pageId, action: "approved", details: `Member ${kind.toLowerCase()} approved` });
  await prisma.notification.create({
    data: {
      userId: sub.authorId,
      pageId,
      message:
        kind === "OFFER"
          ? `Your offer "${titleOf(kind, data)}" was approved and is now on your listing`
          : `Your ${kind === "EVENT" ? "event" : kind === "NEWS" ? "news story" : "listing"} "${titleOf(kind, data)}" was approved and is now live`,
    },
  });
  refresh(page?.slug ?? null);
  return { pageId };
}

export async function rejectSubmissionAction(id: string, note: string) {
  const session = await requireReviewer();
  const sub = await prisma.submission.findUnique({ where: { id } });
  if (!sub || sub.status !== "SUBMITTED") throw new Error("This submission is no longer waiting for review");
  const reason = note.trim().slice(0, 500);
  if (!reason) throw new Error("Please give the member a short reason");

  await prisma.submission.update({
    where: { id },
    data: { status: "REJECTED", note: reason, decidedById: session.user.id, decidedAt: new Date() },
  });
  await prisma.notification.create({
    data: { userId: sub.authorId, message: `Your submission "${sub.title}" needs another look: ${reason}` },
  });
  refresh(null);
}

// ---------- Advertising space requests ----------

export async function confirmAdBookingAction(ref: string) {
  await requireReviewer();
  const rows = await prisma.adSlotBooking.findMany({ where: { ref, status: "REQUESTED" }, select: { memberId: true } });
  if (rows.length === 0) throw new Error("This request is no longer waiting");
  await prisma.adSlotBooking.updateMany({ where: { ref, status: "REQUESTED" }, data: { status: "CONFIRMED" } });
  await prisma.notification.create({
    data: { userId: rows[0].memberId, message: `Your advertising space request ${ref} is confirmed. An invoice will follow.` },
  });
  refresh(null);
}

export async function declineAdBookingAction(ref: string) {
  await requireReviewer();
  const rows = await prisma.adSlotBooking.findMany({ where: { ref, status: "REQUESTED" }, select: { memberId: true } });
  if (rows.length === 0) throw new Error("This request is no longer waiting");
  await prisma.adSlotBooking.updateMany({ where: { ref, status: "REQUESTED" }, data: { status: "CANCELLED" } });
  await prisma.notification.create({
    data: { userId: rows[0].memberId, message: `We could not take your advertising space request ${ref}. Please contact the team.` },
  });
  refresh(null);
}
