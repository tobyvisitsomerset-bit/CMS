"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, SpellCheck } from "lucide-react";
import type { PageStatus } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  archivePageAction,
  publishPageAction,
  restorePageAction,
  submitForReviewAction,
  unpublishPageAction,
} from "@/app/cms/actions";
import { NotificationsBell } from "./notifications-bell";

const GREY_BTN =
  "inline-flex h-8 items-center gap-1.5 border border-[#b3b3ae] bg-[#c9c9c5] px-3.5 text-[13px] font-semibold text-[#3b3a39] hover:bg-[#bdbdb9] disabled:opacity-50";

// Kentico 11's page toolbar: green Save, the workflow button (Archive /
// Publish / Approve) with a "..." more-options split, Spell check, and the
// "Send notification emails" tick box on the right.
export function EditorToolbar({
  pageId,
  status,
  canEdit,
  canPublish,
  canArchive,
  canReview,
  isMember,
  notify,
  onNotifyChange,
  onSave,
  onSpellCheck,
  onViewLive,
  showSave,
}: {
  pageId: string;
  status: PageStatus;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
  isMember: boolean;
  notify: boolean;
  onNotifyChange: (v: boolean) => void;
  onSave: () => void;
  onSpellCheck: () => void;
  onViewLive: () => void;
  showSave: boolean;
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

  // The primary (left-hand) workflow button for the page's current state.
  let primary: { label: string; run: () => void } | null = null;
  if (status === "DRAFT" && isMember) primary = { label: "Submit for review", run: () => run(() => submitForReviewAction(pageId), "Submitted for review") };
  else if (status === "DRAFT" && canPublish) primary = { label: "Publish", run: () => run(() => publishPageAction(pageId, { notify }), "Published") };
  else if (status === "PENDING_APPROVAL" && canReview) primary = { label: "Approve", run: () => run(() => publishPageAction(pageId, { notify }), "Approved and published") };
  else if (status === "PUBLISHED" && canArchive) primary = { label: "Archive", run: () => run(() => archivePageAction(pageId), "Archived") };
  else if (status === "ARCHIVED" && canArchive) primary = { label: "Restore", run: () => run(() => restorePageAction(pageId), "Restored") };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        {showSave && canEdit && (
          <button
            type="button"
            onClick={onSave}
            className="inline-flex h-8 items-center bg-[#467c07] px-4 text-[13px] font-semibold text-white hover:bg-[#3b6a05]"
          >
            Save
          </button>
        )}

        {primary && (
          <div className="inline-flex">
            <button type="button" disabled={pending} onClick={primary.run} className={GREY_BTN}>
              {primary.label}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger className={`${GREY_BTN} border-l-0 px-2`} aria-label="More options">
                <span className="text-lg leading-none">···</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {status === "PUBLISHED" && canPublish && (
                  <DropdownMenuItem onClick={() => run(() => unpublishPageAction(pageId), "Unpublished — back to draft")}>
                    Unpublish (back to draft)
                  </DropdownMenuItem>
                )}
                {status === "PENDING_APPROVAL" && canReview && (
                  <DropdownMenuItem onClick={() => run(() => unpublishPageAction(pageId), "Sent back to draft")}>Reject</DropdownMenuItem>
                )}
                {status === "DRAFT" && canArchive && (
                  <DropdownMenuItem onClick={() => run(() => archivePageAction(pageId), "Archived")}>Archive</DropdownMenuItem>
                )}
                {status === "DRAFT" && isMember && canPublish && (
                  <DropdownMenuItem onClick={() => run(() => publishPageAction(pageId, { notify }), "Published")}>Publish</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewLive}>{status === "PUBLISHED" ? "View live page" : "Preview page"}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        {!primary && (
          <button type="button" className={GREY_BTN} onClick={onViewLive}>
            {status === "PUBLISHED" ? "View live" : "Preview"} <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
          </button>
        )}

        {showSave && canEdit && (
          <button type="button" className={GREY_BTN} onClick={onSpellCheck}>
            <SpellCheck className="h-4 w-4" /> Spell check
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {showSave && canEdit && (
          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[#262524]">
            <input type="checkbox" checked={notify} onChange={(e) => onNotifyChange(e.target.checked)} className="size-4 accent-[#467c07]" />
            Send notification emails
          </label>
        )}
        <NotificationsBell />
      </div>
    </div>
  );
}
