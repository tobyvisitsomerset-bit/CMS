"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, ExternalLink } from "lucide-react";
import type { PageStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  archivePageAction,
  publishPageAction,
  restorePageAction,
  submitForReviewAction,
  unpublishPageAction,
} from "@/app/cms/actions";
import { AuditLogSheet } from "./audit-log-sheet";
import { VersionHistorySheet } from "./version-history-sheet";

export function StatusActions({
  pageId,
  status,
  canPublish,
  canArchive,
  canReview,
  canEdit,
  isMember,
  onViewLive,
}: {
  pageId: string;
  status: PageStatus;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
  canEdit: boolean;
  isMember: boolean;
  onViewLive: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(fn: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(message);
        router.refresh();
      } catch {
        toast.error("Action failed — check your permissions.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && isMember && (
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => submitForReviewAction(pageId), "Submitted for review")}>
          Submit for review
        </Button>
      )}
      {status === "PENDING_APPROVAL" && canReview && (
        <>
          <Button size="sm" disabled={pending} onClick={() => run(() => publishPageAction(pageId), "Approved and published")}>
            Approve &amp; Publish
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unpublishPageAction(pageId), "Sent back to draft")}>
            Reject
          </Button>
        </>
      )}
      {status === "DRAFT" && canPublish && !isMember && (
        <Button size="sm" disabled={pending} onClick={() => run(() => publishPageAction(pageId), "Published")}>
          Publish
        </Button>
      )}
      {status === "PUBLISHED" && canPublish && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unpublishPageAction(pageId), "Unpublished")}>
          Unpublish
        </Button>
      )}
      {status === "ARCHIVED" && canArchive && (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => restorePageAction(pageId), "Restored")}>
          Restore
        </Button>
      )}
      {status !== "ARCHIVED" && canArchive && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => archivePageAction(pageId), "Archived")}>
          Archive
        </Button>
      )}

      <div className="mx-1 h-5 w-px bg-neutral-200" />

      <Button size="sm" variant="outline" onClick={onViewLive}>
        <ExternalLink className="h-4 w-4" /> View Live
      </Button>
      <VersionHistorySheet pageId={pageId} canEdit={canEdit} />
      <AuditLogSheet pageId={pageId} />
      <Button
        size="icon"
        variant="ghost"
        title="Notifications"
        onClick={() => toast.message("Notifications arrive in Phase 3.")}
      >
        <Bell className="h-4 w-4" />
      </Button>
    </div>
  );
}
