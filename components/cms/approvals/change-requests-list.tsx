"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { approveChangeAction, rejectChangeAction } from "@/app/cms/change-actions";

export type ChangeItem = {
  id: string;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  author: string;
  submittedAt: string;
  changes: { key: string; label: string; before: string; after: string }[];
};

export function ChangeRequestsList({ items }: { items: ChangeItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [note, setNote] = useState("");

  function run(fn: () => Promise<unknown>, message: string) {
    start(async () => {
      try {
        await fn();
        toast.success(message);
        setRejecting(null);
        setNote("");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Action failed.");
      }
    });
  }

  if (items.length === 0) {
    return <p className="rounded-lg border bg-white p-4 text-sm text-neutral-400">No member edits waiting for review.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
            <div>
              <Link href={`/cms/${it.pageId}`} className="font-medium hover:underline">
                {it.pageTitle}
              </Link>
              <p className="text-xs text-neutral-500">
                Edited by {it.author} · {formatDistanceToNow(new Date(it.submittedAt), { addSuffix: true })} ·{" "}
                <Link href={`/${it.pageSlug}`} target="_blank" className="underline">
                  live page
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(rejecting === it.id ? null : it.id)}>
                Send back
              </Button>
              <Button size="sm" disabled={pending} onClick={() => run(() => approveChangeAction(it.id), "Approved and live")}>
                Approve &amp; publish
              </Button>
            </div>
          </div>

          <div className="divide-y">
            {it.changes.map((c) => (
              <div key={c.key} className="grid gap-2 p-4 text-sm sm:grid-cols-[10rem_1fr_1fr]">
                <p className="font-medium text-neutral-700">{c.label}</p>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Live now</p>
                  <p className="whitespace-pre-wrap break-words text-neutral-500 line-through decoration-neutral-300">{c.before}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-somerset-green">Proposed</p>
                  <p className="whitespace-pre-wrap break-words text-neutral-900">{c.after}</p>
                </div>
              </div>
            ))}
          </div>

          {rejecting === it.id && (
            <div className="space-y-2 border-t bg-neutral-50 p-4">
              <p className="text-sm font-medium">Tell {it.author} what to change</p>
              <Textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="For example: the phone number looks wrong, please check it." />
              <Button size="sm" disabled={pending || !note.trim()} onClick={() => run(() => rejectChangeAction(it.id, note), "Sent back to the member")}>
                Send back to member
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
