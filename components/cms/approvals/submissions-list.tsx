"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  approveSubmissionAction,
  confirmAdBookingAction,
  declineAdBookingAction,
  rejectSubmissionAction,
} from "@/app/cms/change-actions";

export type SubmissionItem = {
  id: string;
  kind: "LISTING" | "EVENT" | "OFFER" | "NEWS";
  title: string;
  author: string;
  submittedAt: string;
  rows: { label: string; value: string }[];
};

export type AdRequestItem = {
  ref: string;
  author: string;
  listing: string;
  placements: string[];
  weeks: string[];
  amount: string;
  poNumber: string | null;
  requestedAt: string;
};

const KIND_LABEL = { LISTING: "New listing", EVENT: "New event", OFFER: "New offer", NEWS: "News story" } as const;

export function SubmissionsList({ items, ads }: { items: SubmissionItem[]; ads: AdRequestItem[] }) {
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

  if (items.length === 0 && ads.length === 0) {
    return <p className="rounded-lg border bg-white p-4 text-sm text-neutral-400">No new listings, events, offers or advertising requests waiting.</p>;
  }

  return (
    <div className="space-y-4">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
            <div>
              <p className="font-medium">
                <span className="mr-2 rounded-full bg-somerset-green/10 px-2 py-0.5 text-xs font-semibold text-somerset-green">{KIND_LABEL[it.kind]}</span>
                {it.title}
              </p>
              <p className="text-xs text-neutral-500">
                From {it.author} · {formatDistanceToNow(new Date(it.submittedAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejecting(rejecting === it.id ? null : it.id)}>
                Send back
              </Button>
              <Button size="sm" disabled={pending} onClick={() => run(() => approveSubmissionAction(it.id), "Approved and live")}>
                Approve &amp; publish
              </Button>
            </div>
          </div>
          <dl className="divide-y">
            {it.rows.map((r) => (
              <div key={r.label} className="grid gap-1 p-3 text-sm sm:grid-cols-[11rem_1fr]">
                <dt className="font-medium text-neutral-600">{r.label}</dt>
                <dd className="whitespace-pre-wrap break-words text-neutral-900">{r.value}</dd>
              </div>
            ))}
          </dl>
          {rejecting === it.id && (
            <div className="space-y-2 border-t bg-neutral-50 p-4">
              <p className="text-sm font-medium">Tell {it.author} what to change</p>
              <Textarea rows={3} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
              <Button size="sm" disabled={pending || !note.trim()} onClick={() => run(() => rejectSubmissionAction(it.id, note), "Sent back to the member")}>
                Send back to member
              </Button>
            </div>
          )}
        </div>
      ))}

      {ads.map((a) => (
        <div key={a.ref} className="rounded-lg border bg-white">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                <span className="mr-2 rounded-full bg-damson/10 px-2 py-0.5 text-xs font-semibold text-damson">Advertising space</span>
                {a.listing} <span className="text-neutral-400">· {a.ref}</span>
              </p>
              <p className="mt-1 text-sm text-neutral-700">
                {a.placements.join(", ")} · weeks from {a.weeks.join(", ")}
              </p>
              <p className="text-xs text-neutral-500">
                {a.author} · {formatDistanceToNow(new Date(a.requestedAt), { addSuffix: true })} · {a.amount}
                {a.poNumber ? ` · PO ${a.poNumber}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => declineAdBookingAction(a.ref), "Request declined")}>
                Decline
              </Button>
              <Button size="sm" disabled={pending} onClick={() => run(() => confirmAdBookingAction(a.ref), "Confirmed")}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
