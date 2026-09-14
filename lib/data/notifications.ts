import { prisma } from "@/lib/prisma";

export async function listNotifications(userId: string, take = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markNotificationRead(id: string, userId: string) {
  // Scoped to userId so one user can never mark another's notification read.
  await prisma.notification.updateMany({ where: { id, userId }, data: { read: true } });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}

export async function notifyAssignment(memberId: string, pageTitle: string, pageId: string) {
  await prisma.notification.create({
    data: { userId: memberId, message: `You've been assigned to manage "${pageTitle}"`, pageId },
  });
}

export async function notifySubmittedForReview(pageTitle: string, pageId: string, submittedBy: string) {
  const reviewers = await prisma.user.findMany({
    where: { role: { key: { in: ["SUPER_ADMIN", "CONTENT_ADMIN"] } } },
    select: { id: true },
  });
  if (reviewers.length === 0) return;
  await prisma.notification.createMany({
    data: reviewers.map((r) => ({
      userId: r.id,
      message: `${submittedBy} submitted "${pageTitle}" for approval`,
      pageId,
    })),
  });
}

export async function notifyPublished(pageTitle: string, pageId: string, assignedMemberId: string | null) {
  if (!assignedMemberId) return;
  await prisma.notification.create({
    data: { userId: assignedMemberId, message: `Your page "${pageTitle}" was approved and published`, pageId },
  });
}
