import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { SubmissionRows } from "@/components/portal/submission-rows";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [pages, submissions] = await Promise.all([
    prisma.page.findMany({
      where: { assignedMemberId: userId, status: { not: "ARCHIVED" }, customFields: { contains: "ItemStartDate" } },
      select: { id: true, title: true, slug: true, status: true, customFields: true },
    }),
    prisma.submission.findMany({
      where: { authorId: userId, kind: "EVENT", status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const events = pages
    .map((p) => ({ ...p, info: getBusinessInfo(parseCustomFields(p.customFields)) }))
    .filter((p) => p.info?.startDate)
    .sort((a, b) => (a.info!.startDate! < b.info!.startDate! ? 1 : -1));

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-black text-stone-900">Events</h1>
          <p className="mt-1 text-stone-600">Your events on the Visit Somerset festivals and events pages.</p>
        </div>
        <Link href="/portal/submit/event" className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + Add an event
        </Link>
      </div>

      {submissions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-black">Waiting for you or the team</h2>
          <SubmissionRows rows={submissions} kind="event" empty="" />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl font-black">Your events on the site</h2>
        {events.length === 0 ? (
          <p className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No events yet. Add one and the team will review it.
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-4">
                <div>
                  <p className="font-serif text-lg font-black text-stone-900">{e.title}</p>
                  <p className="text-sm text-stone-500">
                    {new Date(e.info!.startDate!).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                    {e.info!.town ? ` · ${e.info!.town}` : ""} · {e.status === "PUBLISHED" ? "Live" : "Not live"}
                  </p>
                </div>
                <div className="flex gap-2 text-sm font-semibold">
                  {e.status === "PUBLISHED" && (
                    <Link href={`/${e.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-50">
                      View live <ExternalLink className="size-3.5" />
                    </Link>
                  )}
                  <Link href={`/portal/listing/${e.id}/edit`} className="rounded-full bg-somerset-green px-4 py-2 text-white hover:opacity-90">
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
