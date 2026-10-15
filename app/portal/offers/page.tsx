import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionRows } from "@/components/portal/submission-rows";
import { daysAgo } from "@/lib/data/views";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const session = await auth();
  const userId = session!.user.id;
  const owned = await prisma.page.findMany({
    where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
  });
  const [offers, submissions] = await Promise.all([
    prisma.offer.findMany({ where: { pageId: { in: owned.map((p) => p.id) } }, orderBy: { createdAt: "desc" } }),
    prisma.submission.findMany({
      where: { authorId: userId, kind: "OFFER", status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const titleOf = (id: string) => owned.find((p) => p.id === id)?.title ?? "Listing";
  const now = daysAgo(0).getTime();

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-black text-stone-900">Offers</h1>
          <p className="mt-1 text-stone-600">Special offers shown on your listing pages.</p>
        </div>
        <Link href="/portal/submit/offer" className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + Add an offer
        </Link>
      </div>

      {submissions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-black">Waiting for you or the team</h2>
          <SubmissionRows rows={submissions} kind="offer" empty="" />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl font-black">Offers on the site</h2>
        {offers.length === 0 ? (
          <p className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">No offers yet. Add one and the team will review it.</p>
        ) : (
          <div className="space-y-3">
            {offers.map((o) => {
              const expired = o.validTo ? o.validTo.getTime() < now : false;
              return (
                <div key={o.id} className="rounded-3xl border border-stone-200 bg-white p-4">
                  <p className="font-serif text-lg font-black text-stone-900">
                    {o.title}{" "}
                    <span className={`ml-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${expired ? "bg-stone-100 text-stone-500" : "bg-somerset-green/10 text-somerset-green"}`}>
                      {expired ? "Ended" : "Live"}
                    </span>
                  </p>
                  <p className="text-sm text-stone-500">
                    {titleOf(o.pageId)}
                    {o.validTo ? ` · until ${o.validTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </p>
                  {o.description && <p className="mt-2 text-sm text-stone-700">{o.description}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
