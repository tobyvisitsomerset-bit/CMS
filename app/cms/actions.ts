"use server";

import { revalidatePath, updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { withListingMarker } from "@/lib/listing-marker";
import { setPlacements } from "@/lib/data/placements";
import { auth } from "@/lib/auth";
import { hasCapability, canAccessPage, canEditLive, isAdmin } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import * as pagesData from "@/lib/data/pages";
import * as mediaData from "@/lib/data/media";
import * as versionsData from "@/lib/data/versions";
import * as templatesData from "@/lib/data/templates";
import * as usersData from "@/lib/data/users";
import * as notificationsData from "@/lib/data/notifications";

async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  return session;
}

export async function createPageAction(input: {
  title: string;
  parentId: string | null;
  isSection: boolean;
  templateId?: string | null;
}) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.create")) throw new Error("Not permitted");

  const page = await pagesData.createPage({
    title: input.title,
    parentId: input.parentId,
    isSection: input.isSection,
    authorId: session.user.id,
    ownerId: session.user.id,
  });
  if (input.templateId && !input.isSection) {
    await templatesData.applyTemplateToPage(page.id, input.templateId);
  }
  await logAudit({ userId: session.user.id, pageId: page.id, action: "created", details: page.title });
  await versionsData.createVersionSnapshot(page.id, session.user.id, "Page created");
  revalidatePath("/cms");
  return page;
}

// ---------- Page templates ----------

// Re-templates a page (and optionally its sub-sections) so a family of pages,
// e.g. Hotels, B&Bs, Camping, can all use the same landing layout.
export async function changePageTemplateAction(input: {
  pageId: string;
  templateId: string;
  scope?: "page" | "children" | "all";
  /** Older callers: true meant the sections directly under the page. */
  includeSubsections?: boolean;
}) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey) || !hasCapability(session.user.roleKey, "pages.edit")) throw new Error("Not permitted");
  const page = await pagesData.getPageById(input.pageId);
  if (!page) throw new Error("Page not found");

  const targets: { id: string; title: string }[] = [{ id: page.id, title: page.title }];
  const scope = input.scope ?? (input.includeSubsections ? "children" : "page");
  if (scope !== "page") {
    // Sections (pages with pages under them) that are still plain, so nothing
    // an editor built is overwritten. "all" walks every level beneath.
    let frontier = [page.id];
    for (let depth = 0; frontier.length > 0 && depth < (scope === "children" ? 1 : 6) && targets.length < 200; depth++) {
      const kids = await prisma.page.findMany({
        where: { parentId: { in: frontier }, status: { not: "ARCHIVED" }, linkedPageId: null },
        select: { id: true, title: true, _count: { select: { children: true, contentBlocks: true } } },
      });
      frontier = [];
      for (const k of kids) {
        if (k._count.children === 0) continue;
        frontier.push(k.id);
        if (k._count.contentBlocks === 0) targets.push({ id: k.id, title: k.title });
      }
    }
  }

  for (const t of targets) {
    await versionsData.createVersionSnapshot(t.id, session.user.id, "Before template change");
    await templatesData.applyTemplateToPage(t.id, input.templateId);
    await versionsData.createVersionSnapshot(t.id, session.user.id, "Template changed");
    await logAudit({ userId: session.user.id, pageId: t.id, action: "updated", details: "Page template changed" });
  }
  updateTag("listings");
  revalidatePath("/cms");
  for (const t of targets) {
    const p = await prisma.page.findUnique({ where: { id: t.id }, select: { slug: true } });
    if (p) revalidatePath(`/${p.slug}`);
  }
  return { changed: targets.map((t) => t.title) };
}


export async function listTemplatesAction() {
  await requireSession();
  return templatesData.listTemplates();
}

export async function saveAsTemplateAction(pageId: string, name: string, description?: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.create")) throw new Error("Not permitted");
  const template = await templatesData.createTemplateFromPage(pageId, name, description, session.user.id);
  revalidatePath("/cms");
  return template;
}

export async function deleteTemplateAction(id: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.create")) throw new Error("Not permitted");
  await templatesData.deleteTemplate(id);
  revalidatePath("/cms");
}

export async function clonePageAction(pageId: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.clone")) throw new Error("Not permitted");

  const page = await pagesData.clonePage(pageId);
  await logAudit({ userId: session.user.id, pageId: page.id, action: "cloned", details: page.title });
  revalidatePath("/cms");
  return page;
}

export async function archivePageAction(pageId: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.archive")) throw new Error("Not permitted");

  const page = await pagesData.setPageStatus(pageId, "ARCHIVED");
  await logAudit({ userId: session.user.id, pageId: page.id, action: "archived" });
  revalidatePath("/cms");
  return page;
}

export async function restorePageAction(pageId: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.archive")) throw new Error("Not permitted");

  const page = await pagesData.setPageStatus(pageId, "DRAFT");
  await logAudit({ userId: session.user.id, pageId: page.id, action: "restored" });
  revalidatePath("/cms");
  return page;
}

export async function deletePageAction(pageId: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.delete")) throw new Error("Not permitted");

  await logAudit({ userId: session.user.id, pageId, action: "deleted" });
  await pagesData.deletePage(pageId);
  revalidatePath("/cms");
}

export async function publishPageAction(pageId: string, opts: { notify?: boolean } = {}) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.publish")) throw new Error("Not permitted");

  const page = await pagesData.setPageStatus(pageId, "PUBLISHED");
  await logAudit({ userId: session.user.id, pageId: page.id, action: "published" });
  // The "Send notification emails" checkbox in the editor toolbar. Members
  // are notified in their portal / notification bell (no email service yet).
  if (opts.notify !== false) await notificationsData.notifyPublished(page.title, page.id, page.assignedMemberId);
  revalidatePath("/cms");
  return page;
}

export async function unpublishPageAction(pageId: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.publish")) throw new Error("Not permitted");

  const page = await pagesData.setPageStatus(pageId, "DRAFT");
  await logAudit({ userId: session.user.id, pageId: page.id, action: "unpublished" });
  revalidatePath("/cms");
  return page;
}

export async function submitForReviewAction(pageId: string) {
  const session = await requireSession();
  const existing = await pagesData.getPageById(pageId);
  if (!existing) throw new Error("Page not found");
  if (!isAdmin(session.user.roleKey) && existing.assignedMemberId !== session.user.id) {
    throw new Error("Not permitted");
  }
  const page = await pagesData.setPageStatus(pageId, "PENDING_APPROVAL");
  await logAudit({ userId: session.user.id, pageId: page.id, action: "submitted" });
  await notificationsData.notifySubmittedForReview(page.title, page.id, session.user.name ?? "Someone");
  revalidatePath("/cms");
  return page;
}

export async function reorderPageAction(pageId: string, parentId: string | null, sortOrder: number) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.reorder")) throw new Error("Not permitted");

  const page = await pagesData.reorderPage(pageId, parentId, sortOrder);
  revalidatePath("/cms");
  return page;
}

export async function saveContentAction(
  pageId: string,
  data: Parameters<typeof pagesData.updatePage>[1],
  relations?: { tags: string[]; categories: string[] },
) {
  const session = await requireSession();
  const existing = await pagesData.getPageById(pageId);
  if (!existing) throw new Error("Page not found");
  if (!canAccessPage(session.user.roleKey, session.user.id, existing)) throw new Error("Not permitted");
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");

  if (data.customFields !== undefined) {
    data = { ...data, customFields: withListingMarker(data.customFields, { slug: data.slug ?? existing.slug, isSection: existing.isSection }) };
  }
  const page = await pagesData.updatePage(pageId, data);
  updateTag("listings");
  if (relations) {
    await pagesData.setPageTagsAndCategories(pageId, relations.tags, relations.categories);
  }
  await logAudit({ userId: session.user.id, pageId: page.id, action: "updated" });
  await versionsData.createVersionSnapshot(pageId, session.user.id, "Content updated");
  revalidatePath("/cms");
  return page;
}

export async function deleteOfferAction(offerId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  const offer = await prisma.offer.findUnique({ where: { id: offerId }, select: { pageId: true, title: true } });
  if (!offer) return;
  await prisma.offer.delete({ where: { id: offerId } });
  await logAudit({ userId: session.user.id, pageId: offer.pageId, action: "updated", details: `Offer removed: ${offer.title}` });
  updateTag("listings");
  revalidatePath("/cms");
  const page = await prisma.page.findUnique({ where: { id: offer.pageId }, select: { slug: true } });
  if (page) revalidatePath(`/${page.slug}`);
}

export async function saveSeoAction(
  pageId: string,
  data: {
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    socialShareImage: string | null;
    schemaMarkup: string | null;
  },
) {
  const session = await requireSession();
  const existing = await pagesData.getPageById(pageId);
  if (!existing) throw new Error("Page not found");
  if (!canAccessPage(session.user.roleKey, session.user.id, existing)) throw new Error("Not permitted");
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");

  const page = await prisma.page.update({ where: { id: pageId }, data });
  await logAudit({ userId: session.user.id, pageId: page.id, action: "updated", details: "SEO settings" });
  await versionsData.createVersionSnapshot(pageId, session.user.id, "SEO updated");
  revalidatePath("/cms");
  return page;
}

// ---------- Design tab (page builder) ----------

export async function addContentBlockAction(pageId: string, type: string) {
  const session = await requireSession();
  const existing = await pagesData.getPageById(pageId);
  if (!existing) throw new Error("Page not found");
  if (!canAccessPage(session.user.roleKey, session.user.id, existing)) throw new Error("Not permitted");
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");

  const count = await prisma.contentBlock.count({ where: { pageId } });
  const block = await prisma.contentBlock.create({
    data: { pageId, type, sortOrder: count, config: "{}" },
  });
  revalidatePath("/cms");
  return block;
}

export async function updateContentBlockAction(blockId: string, config: Record<string, unknown>) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  const block = await prisma.contentBlock.update({
    where: { id: blockId },
    data: { config: JSON.stringify(config) },
  });
  await versionsData.createVersionSnapshot(block.pageId, session.user.id, "Design updated");
  revalidatePath("/cms");
  return block;
}

export async function deleteContentBlockAction(blockId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  const block = await prisma.contentBlock.delete({ where: { id: blockId } });
  await versionsData.createVersionSnapshot(block.pageId, session.user.id, "Section removed");
  revalidatePath("/cms");
  return block;
}

export async function reorderContentBlocksAction(pageId: string, orderedBlockIds: string[]) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  await Promise.all(
    orderedBlockIds.map((id, index) => prisma.contentBlock.update({ where: { id }, data: { sortOrder: index } })),
  );
  revalidatePath("/cms");
}

// ---------- Rooms & Reviews ----------
// Entered by the assigned member (or an admin) from the page editor. The
// consumer-facing detail page only shows a "Rooms available" / "Reviews"
// section once a page actually has some — no placeholder/mock content.

async function assertCanEditPage(pageId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  const page = await pagesData.getPageById(pageId);
  if (!page) throw new Error("Page not found");
  if (!canAccessPage(session.user.roleKey, session.user.id, page)) throw new Error("Not permitted");
  return session;
}

export async function addRoomAction(pageId: string, data: { name: string; description?: string | null; imageUrl?: string | null; priceLabel?: string | null; features?: string[]; bookingUrl?: string | null }) {
  await assertCanEditPage(pageId);
  const count = await prisma.room.count({ where: { pageId } });
  const room = await prisma.room.create({
    data: {
      pageId,
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      priceLabel: data.priceLabel || null,
      features: data.features?.length ? JSON.stringify(data.features) : null,
      bookingUrl: data.bookingUrl || null,
      sortOrder: count,
    },
  });
  revalidatePath("/cms");
  const owner = await prisma.page.findUnique({ where: { id: pageId }, select: { slug: true } });
  if (owner) revalidatePath(`/${owner.slug}`);
  return room;
}

export async function updateRoomAction(roomId: string, data: { name: string; description?: string | null; imageUrl?: string | null; priceLabel?: string | null; features?: string[]; bookingUrl?: string | null }) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error("Room not found");
  await assertCanEditPage(room.pageId);
  const updated = await prisma.room.update({
    where: { id: roomId },
    data: {
      name: data.name,
      description: data.description || null,
      imageUrl: data.imageUrl || null,
      priceLabel: data.priceLabel || null,
      features: data.features?.length ? JSON.stringify(data.features) : null,
      bookingUrl: data.bookingUrl || null,
    },
  });
  revalidatePath("/cms");
  // Rooms show on the public page too — refresh it straight away.
  const owner = await prisma.page.findUnique({ where: { id: room.pageId }, select: { slug: true } });
  if (owner) revalidatePath(`/${owner.slug}`);
  return updated;
}

export async function deleteRoomAction(roomId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error("Room not found");
  await assertCanEditPage(room.pageId);
  await prisma.room.delete({ where: { id: roomId } });
  revalidatePath("/cms");
}

export async function addReviewAction(pageId: string, data: { authorName: string; rating: number; quote: string; reviewDate?: string | null }) {
  await assertCanEditPage(pageId);
  const count = await prisma.review.count({ where: { pageId } });
  const review = await prisma.review.create({
    data: {
      pageId,
      authorName: data.authorName,
      rating: data.rating,
      quote: data.quote,
      reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
      sortOrder: count,
    },
  });
  revalidatePath("/cms");
  return review;
}

export async function updateReviewAction(reviewId: string, data: { authorName: string; rating: number; quote: string; reviewDate?: string | null }) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");
  await assertCanEditPage(review.pageId);
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      authorName: data.authorName,
      rating: data.rating,
      quote: data.quote,
      reviewDate: data.reviewDate ? new Date(data.reviewDate) : null,
    },
  });
  revalidatePath("/cms");
  return updated;
}

export async function deleteReviewAction(reviewId: string) {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("Review not found");
  await assertCanEditPage(review.pageId);
  await prisma.review.delete({ where: { id: reviewId } });
  revalidatePath("/cms");
}

// ---------- Media library ----------

export async function uploadMediaCompleteAction() {
  // Upload itself happens via /api/media/upload (multipart); this just triggers a UI refresh.
  revalidatePath("/cms/media");
}

export async function createMediaFolderAction(name: string, parentId: string | null) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "media.upload")) throw new Error("Not permitted");
  const folder = await mediaData.createFolder(name, parentId);
  revalidatePath("/cms/media");
  return folder;
}

export async function deleteMediaAction(id: string) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "media.delete")) throw new Error("Not permitted");
  await mediaData.deleteMedia(id);
  revalidatePath("/cms/media");
}

export async function moveMediaAction(id: string, folderId: string | null) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "media.upload")) throw new Error("Not permitted");
  const media = await mediaData.moveMedia(id, folderId);
  revalidatePath("/cms/media");
  return media;
}

export async function getMediaUsageAction(url: string) {
  await requireSession();
  return mediaData.getMediaUsage(url);
}

export async function listMediaAction(params: { folderId?: string | null; search?: string }) {
  await requireSession();
  return mediaData.listMedia(params);
}

export async function getUnusedMediaAction() {
  await requireSession();
  return mediaData.getUnusedMedia();
}

export async function getRecentMediaAction() {
  await requireSession();
  return mediaData.getRecentMedia();
}

export async function getFolderTreeAction() {
  await requireSession();
  return mediaData.getFolderTree();
}

// ---------- Version history ----------

export async function listVersionsAction(pageId: string) {
  await requireSession();
  return versionsData.listVersions(pageId);
}

export async function rollbackVersionAction(versionId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey)) throw new Error("Not permitted");
  const version = await versionsData.getVersion(versionId);
  if (!version) throw new Error("Version not found");
  if (!hasCapability(session.user.roleKey, "pages.edit") && session.user.roleKey !== "MEMBER") {
    throw new Error("Not permitted");
  }
  const page = await versionsData.rollbackToVersion(versionId, session.user.id);
  await logAudit({
    userId: session.user.id,
    pageId: version.pageId,
    action: "updated",
    details: `Rolled back to version ${version.versionNumber}`,
  });
  revalidatePath("/cms");
  return page;
}

// ---------- Workflow approvals ----------

export async function listPendingApprovalsAction() {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "workflow.review")) throw new Error("Not permitted");
  return prisma.page.findMany({
    where: { status: "PENDING_APPROVAL" },
    include: { assignedMember: { select: { name: true } }, author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function setPlacementsAction(pageId: string, landingIds: string[]) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey) || !hasCapability(session.user.roleKey, "pages.edit")) throw new Error("Not permitted");
  const kept = await setPlacements(pageId, landingIds, session.user.id, null);
  await logAudit({ userId: session.user.id, pageId, action: "updated", details: `Shown on ${kept.length} extra landing page(s)` });
  updateTag("listings");
  revalidatePath("/cms");
  return { count: kept.length };
}

// Marks the pages beneath a section that carry business details but were
// never given the listing marker (created in the CMS), so lists, the map and
// search include them.
export async function markSectionListingsAction(pageId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey) || !hasCapability(session.user.roleKey, "pages.edit")) throw new Error("Not permitted");
  const below = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH RECURSIVE t AS (
      SELECT id FROM "Page" WHERE id = ${pageId}
      UNION ALL
      SELECT p.id FROM "Page" p JOIN t ON p."parentId" = t.id
    )
    SELECT id FROM t`);
  const rows = await prisma.page.findMany({
    where: {
      id: { in: below.map((b) => b.id).filter((id) => id !== pageId).slice(0, 5000) },
      status: "PUBLISHED",
      linkedPageId: null,
      isSection: false,
      OR: [{ customFields: null }, { NOT: { customFields: { contains: "_kenticoClassName" } } }],
    },
    select: { id: true, slug: true, isSection: true, customFields: true },
  });
  let n = 0;
  for (const r of rows) {
    const next = withListingMarker(r.customFields, { slug: r.slug, isSection: r.isSection });
    if (next && next !== r.customFields) {
      await prisma.page.update({ where: { id: r.id }, data: { customFields: next } });
      n++;
    }
  }
  await logAudit({ userId: session.user.id, pageId, action: "updated", details: `Marked ${n} page(s) as listings` });
  updateTag("listings");
  revalidatePath("/cms");
  return { marked: n };
}

export async function linkExistingPageAction(parentId: string, targetId: string) {
  const session = await requireSession();
  if (!canEditLive(session.user.roleKey) || !hasCapability(session.user.roleKey, "pages.create")) throw new Error("Not permitted");
  const link = await pagesData.createLinkedPage({ targetId, parentId, authorId: session.user.id });
  await logAudit({ userId: session.user.id, pageId: link.id, action: "created", details: `Linked page: ${link.title}` });
  updateTag("listings");
  revalidatePath("/cms");
  return { id: link.id, title: link.title };
}

export async function searchPagesAction(query: string) {
  await requireSession();
  if (!query.trim()) return [];
  return pagesData.searchPages(query);
}

export async function getPageAuditLogAction(pageId: string) {
  await requireSession();
  return prisma.auditLog.findMany({
    where: { pageId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ---------- Member assignment ----------

export async function listMembersAction() {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  return usersData.listMembers();
}

export async function createMemberAction(input: { name: string; email: string; password: string }) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  const member = await usersData.createMemberUser(input);
  await logAudit({ userId: session.user.id, action: "created", details: `Created member account: ${member.name} (${member.email})` });
  return member;
}

export async function assignPageMemberAction(pageId: string, memberId: string | null) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  const page = await usersData.assignPageMember(pageId, memberId);
  await logAudit({
    userId: session.user.id,
    pageId,
    action: "updated",
    details: memberId ? `Assigned member ${page.assignedMember?.name ?? memberId}` : "Unassigned member",
  });
  if (memberId) await notificationsData.notifyAssignment(memberId, page.title, page.id);
  revalidatePath("/cms");
  return page;
}

// ---------- Notifications ----------

export async function listNotificationsAction() {
  const session = await requireSession();
  return notificationsData.listNotifications(session.user.id);
}

export async function unreadNotificationCountAction() {
  const session = await requireSession();
  return notificationsData.unreadNotificationCount(session.user.id);
}

export async function markNotificationReadAction(id: string) {
  const session = await requireSession();
  await notificationsData.markNotificationRead(id, session.user.id);
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  await notificationsData.markAllNotificationsRead(session.user.id);
}


// Master page tab — the site-wide header / navigation / footer.
export async function saveMasterPageAction(settings: import("@/lib/data/site-settings").MasterSettings) {
  const session = await requireSession();
  if (!hasCapability(session.user.roleKey, "pages.publish")) throw new Error("Not permitted");
  const { saveMasterSettings } = await import("@/lib/data/site-settings");
  const saved = await saveMasterSettings(settings, session.user.id);
  await logAudit({ userId: session.user.id, action: "updated", details: "Master page (header/footer)" });
  revalidatePath("/", "layout");
  return saved;
}
