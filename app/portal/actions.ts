"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifySubmittedForReview } from "@/lib/data/notifications";
import { placementCap, placementsFor } from "@/lib/data/placements";
import {
  deleteSubmission,
  problemsWith,
  sanitise,
  saveSubmission,
  titleOf,
  type SubmissionKind,
} from "@/lib/data/submissions";
import { bookableWeeks, placementByKey, totals } from "@/lib/ad-spaces";
import {
  diffProposal,
  getActiveRequest,
  keepUnchanged,
  parseProposal,
  proposalFromPage,
  sanitiseProposal,
  saveRequest,
  withdrawRequest,
} from "@/lib/data/change-requests";
import { getLandingOptions } from "@/lib/data/placements";

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
    include: { rooms: { orderBy: { sortOrder: "asc" } }, tags: { select: { name: true } } },
  });
  if (!page) throw new Error("Not permitted");
  return page;
}

export type ChangeResult = { ok: true; message: string } | { ok: false; error: string };

export async function saveChangeAction(pageId: string, raw: unknown, submit: boolean): Promise<ChangeResult> {
  const session = await requireMember();
  const page = await ownedPage(pageId, session.user.id);
  const live = proposalFromPage({ ...page, placements: await placementsFor(page.id) });
  const cap = placementCap(page.membershipTier);
  const proposal = keepUnchanged(sanitiseProposal(raw), live);
  proposal.placements = proposal.placements.slice(0, cap);

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
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(next, 12), mustChangePassword: false },
  });
  return { ok: true };
}

// ---------- New listings, events and offers ----------

export type SubmissionResult = { ok: true; message: string; id: string } | { ok: false; error: string };

export async function saveSubmissionAction(
  kind: SubmissionKind,
  raw: unknown,
  submit: boolean,
  id?: string | null,
): Promise<SubmissionResult> {
  const session = await requireMember();
  if (!["LISTING", "EVENT", "OFFER", "NEWS"].includes(kind)) return { ok: false, error: "Unknown type." };
  const data = sanitise(kind, raw);

  if (kind === "OFFER") {
    // An offer can only be for one of the member's own listings.
    const owned = await prisma.page.findFirst({
      where: { id: (data as { pageId: string }).pageId, assignedMemberId: session.user.id },
      select: { id: true },
    });
    if (!owned) return { ok: false, error: "Choose one of your own listings for this offer." };
  }

  if (submit) {
    const problems = problemsWith(kind, data);
    if (problems.length > 0) return { ok: false, error: problems[0] };
  } else if (!titleOf(kind, data)) {
    return { ok: false, error: "Add a name first so the draft can be saved." };
  }

  const saved = await saveSubmission({ id, kind, authorId: session.user.id, data, submit });
  if (submit) {
    const label = kind === "LISTING" ? "new listing" : kind === "EVENT" ? "new event" : kind === "NEWS" ? "news story" : "new offer";
    await notifySubmittedForReview(`${titleOf(kind, data)} (${label})`, saved.id, session.user.name ?? "A member");
  }
  revalidatePath("/portal", "layout");
  revalidatePath("/cms/approvals");
  return {
    ok: true,
    id: saved.id,
    message: submit
      ? "Sent to the Visit Somerset team for approval. It goes live on the site once they approve it."
      : "Draft saved. It is not visible to anyone else until you send it for approval.",
  };
}

export async function deleteSubmissionAction(id: string): Promise<{ ok: true }> {
  const session = await requireMember();
  await deleteSubmission(id, session.user.id);
  revalidatePath("/portal", "layout");
  revalidatePath("/cms/approvals");
  return { ok: true };
}

// ---------- Bookable spaces (advertising placements) ----------

export async function requestAdSpaceAction(input: {
  pageId: string;
  placements: string[];
  weeks: string[];
  poNumber?: string;
}): Promise<{ ok: true; ref: string; total: number } | { ok: false; error: string }> {
  const session = await requireMember();
  await ownedPage(input.pageId, session.user.id);

  const allowedWeeks = new Set(bookableWeeks());
  const weeks = Array.from(new Set(input.weeks)).filter((w) => allowedWeeks.has(w)).sort();
  const keys = Array.from(new Set(input.placements)).filter((k) => placementByKey(k));
  if (keys.length === 0) return { ok: false, error: "Choose at least one page." };
  if (weeks.length === 0) return { ok: false, error: "Choose at least one week." };

  // Slots are checked again on the server; the screen only shows a snapshot.
  const existing = await prisma.adSlotBooking.findMany({
    where: { placement: { in: keys }, weekStart: { in: weeks }, status: { not: "CANCELLED" } },
    select: { placement: true, weekStart: true, memberId: true, pageId: true },
  });
  for (const k of keys) {
    const slots = placementByKey(k)!.slots;
    for (const w of weeks) {
      const taken = existing.filter((e) => e.placement === k && e.weekStart === w);
      if (taken.length >= slots) {
        return { ok: false, error: `${placementByKey(k)!.label} is sold out for the week of ${w}. Please pick another week.` };
      }
      if (taken.some((e) => e.pageId === input.pageId)) {
        return { ok: false, error: `This listing already has ${placementByKey(k)!.label} for the week of ${w}.` };
      }
    }
  }

  const ref = `VS-AD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  await prisma.adSlotBooking.createMany({
    data: keys.flatMap((k) =>
      weeks.map((w) => ({
        ref,
        memberId: session.user.id,
        pageId: input.pageId,
        placement: k,
        weekStart: w,
        pricePence: placementByKey(k)!.weekPencePrice,
        poNumber: (input.poNumber ?? "").trim().slice(0, 60) || null,
      })),
    ),
  });
  const t = totals(keys, weeks);
  await notifySubmittedForReview(`Advertising space ${ref}: ${keys.map((k) => placementByKey(k)!.label).join(", ")}`, input.pageId, session.user.name ?? "A member");
  revalidatePath("/portal", "layout");
  return { ok: true, ref, total: t.total };
}

export async function cancelAdBookingAction(ref: string): Promise<{ ok: true }> {
  const session = await requireMember();
  await prisma.adSlotBooking.updateMany({
    where: { ref, memberId: session.user.id, status: "REQUESTED" },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/portal", "layout");
  return { ok: true };
}

// ---------- "Where you appear": the simple picker ----------

// Sends just the member's landing page choices for approval. Anything else
// they have drafted on that listing travels with it, nothing is lost.
export async function savePlacementsAction(pageId: string, ids: string[]): Promise<ChangeResult> {
  const session = await requireMember();
  const page = await ownedPage(pageId, session.user.id);
  const live = proposalFromPage({ ...page, placements: await placementsFor(page.id) });
  const active = await getActiveRequest(pageId, session.user.id);
  const base = (active ? parseProposal(active.proposal) : null) ?? live;

  const valid = new Set((await getLandingOptions()).map((l) => l.id));
  const cap = placementCap(page.membershipTier);
  const chosen = Array.from(new Set(ids)).filter((id) => valid.has(id) && id !== pageId).slice(0, cap);

  const proposal = { ...base, placements: chosen };
  const changes = diffProposal(live, proposal);
  if (changes.length === 0) {
    return { ok: false, error: "That is how it is already, so there is nothing to send." };
  }
  await saveRequest(pageId, session.user.id, proposal, true);
  await notifySubmittedForReview(page.title, pageId, session.user.name ?? "A member");
  await logAudit({
    userId: session.user.id,
    pageId,
    action: "submitted",
    details: `Member edit: ${changes.map((c) => c.label).join(", ")}`,
  });
  revalidatePath("/portal", "layout");
  revalidatePath("/cms/approvals");
  return { ok: true, message: "Sent to the Visit Somerset team for approval. You will see it on those pages once they approve it." };
}
