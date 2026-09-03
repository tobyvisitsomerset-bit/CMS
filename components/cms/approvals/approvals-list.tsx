"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { publishPageAction, unpublishPageAction } from "@/app/cms/actions";

type PendingPage = {
  id: string;
  title: string;
  updatedAt: Date;
  assignedMember: { name: string } | null;
  author: { name: string } | null;
};

export function ApprovalsList({ pages }: { pages: PendingPage[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(message);
        router.refresh();
      } catch {
        toast.error("Action failed.");
      }
    });
  }

  if (pages.length === 0) {
    return <p className="p-6 text-sm text-neutral-400">Nothing waiting for review right now.</p>;
  }

  return (
    <div className="divide-y rounded-lg border bg-white">
      {pages.map((page) => (
        <div key={page.id} className="flex items-center justify-between gap-4 p-4">
          <div>
            <Link href={`/cms/${page.id}`} className="font-medium hover:underline">
              {page.title}
            </Link>
            <p className="text-xs text-neutral-500">
              Submitted by {page.assignedMember?.name ?? page.author?.name ?? "Unknown"} ·{" "}
              {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => unpublishPageAction(page.id), "Sent back to draft")}>
              Reject
            </Button>
            <Button size="sm" disabled={pending} onClick={() => run(() => publishPageAction(page.id), "Approved and published")}>
              Approve &amp; Publish
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
