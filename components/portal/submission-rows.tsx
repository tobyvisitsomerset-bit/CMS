import Link from "next/link";

type Row = { id: string; title: string; status: string; note: string | null; submittedAt: Date | null; updatedAt: Date };

const BADGE: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: "Draft", cls: "bg-stone-100 text-stone-600" },
  SUBMITTED: { label: "Awaiting approval", cls: "bg-damson/10 text-damson" },
  REJECTED: { label: "Needs another look", cls: "bg-damson/10 text-damson" },
  APPROVED: { label: "Approved", cls: "bg-somerset-green/10 text-somerset-green" },
};

// A member's own submissions (drafts, waiting, sent back) for one kind.
export function SubmissionRows({ rows, kind, empty }: { rows: Row[]; kind: "listing" | "event" | "offer"; empty: string }) {
  if (rows.length === 0) return <p className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">{empty}</p>;
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const b = BADGE[r.status] ?? BADGE.DRAFT;
        return (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-serif text-lg font-black text-stone-900">{r.title}</p>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${b.cls}`}>{b.label}</span>
              </div>
              <p className="mt-0.5 text-sm text-stone-500">
                {r.status === "SUBMITTED" && r.submittedAt
                  ? `Sent ${r.submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                  : `Updated ${r.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}
                {r.status === "REJECTED" && r.note ? ` · "${r.note}"` : ""}
              </p>
            </div>
            <Link
              href={`/portal/submit/${kind}?id=${r.id}`}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50"
            >
              {r.status === "SUBMITTED" ? "See or change" : "Continue editing"}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
