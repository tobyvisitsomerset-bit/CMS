import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "created"
  | "updated"
  | "published"
  | "unpublished"
  | "archived"
  | "restored"
  | "deleted"
  | "cloned"
  | "submitted"
  | "approved"
  | "rejected";

export async function logAudit(params: {
  userId: string;
  pageId?: string;
  action: AuditAction;
  details?: string;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      pageId: params.pageId,
      action: params.action,
      details: params.details,
    },
  });
}
