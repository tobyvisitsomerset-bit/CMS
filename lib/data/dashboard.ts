import { prisma } from "@/lib/prisma";

// Every number here comes from a real query — no placeholder/mock metrics.
// "Most viewed content" from the original spec is deliberately omitted:
// nothing in this stack tracks page views, so faking that number would be
// worse than not showing it.
export async function getDashboardStats() {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [totalPages, totalMembers, statusCounts, expiringSoon, recentActivity, mediaAgg] = await Promise.all([
    prisma.page.count(),
    prisma.user.count({ where: { role: { key: "MEMBER" } } }),
    prisma.page.groupBy({ by: ["status"], _count: true }),
    prisma.page.count({ where: { expiryDate: { gte: now, lte: in30Days } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { name: true } }, page: { select: { title: true } } },
    }),
    prisma.media.aggregate({ _count: true, _sum: { size: true } }),
  ]);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count])) as Record<string, number>;

  return {
    totalPages,
    totalMembers,
    published: statusMap.PUBLISHED ?? 0,
    draft: statusMap.DRAFT ?? 0,
    pendingApproval: statusMap.PENDING_APPROVAL ?? 0,
    archived: statusMap.ARCHIVED ?? 0,
    expiringSoon,
    recentActivity,
    mediaCount: mediaAgg._count,
    mediaStorageBytes: mediaAgg._sum.size ?? 0,
  };
}
