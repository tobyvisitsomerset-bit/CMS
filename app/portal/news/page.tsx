import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionRows } from "@/components/portal/submission-rows";

export const dynamic = "force-dynamic";

function releaseDate(customFields: string | null): string | null {
  if (!customFields) return null;
  try {
    const rows = JSON.parse(customFields) as { key: string; value: string }[];
    return rows.find((r) => r.key === "BlogPostDate")?.value ?? null;
  } catch {
    return null;
  }
}

export default async function NewsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [pages, submissions] = await Promise.all([
    prisma.page.findMany({
      where: { assignedMemberId: userId, status: { not: "ARCHIVED" }, customFields: { contains: "cms.blogpost" } },
      select: { id: true, title: true, slug: true, status: true, customFields: true },
    }),
    prisma.submission.findMany({
      where: { authorId: userId, kind: "NEWS", status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const stories = pages
    .map((p) => ({ ...p, date: releaseDate(p.customFields) }))
    .sort((a, b) => ((a.date ?? "") < (b.date ?? "") ? 1 : -1));

  return (
    <div className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-black text-stone-900">News</h1>
          <p className="mt-1 text-stone-600">Share your news on Visit Somerset. It is filed under the right month automatically.</p>
        </div>
        <Link href="/portal/submit/news" className="rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          + Add a news story
        </Link>
      </div>

      {submissions.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-black">Waiting for you or the team</h2>
          <SubmissionRows rows={submissions} kind="news" empty="" />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 font-serif text-xl font-black">Your stories on the site</h2>
        {stories.length === 0 ? (
          <p className="rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            No news stories yet. Add one and the team will review it.
          </p>
        ) : (
          <div className="space-y-3">
            {stories.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-4">
                <div>
                  <p className="font-serif text-lg font-black text-stone-900">{s.title}</p>
                  <p className="text-sm text-stone-500">
                    {s.date ? new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "No date"} ·{" "}
                    {s.status === "PUBLISHED" ? "Live" : "Not live"}
                  </p>
                </div>
                {s.status === "PUBLISHED" && (
                  <Link href={`/${s.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50">
                    View live <ExternalLink className="size-3.5" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
