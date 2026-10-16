import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubmissionForm } from "@/components/portal/submission-form";
import { parseData, sanitise, type SubmissionKind } from "@/lib/data/submissions";

export const dynamic = "force-dynamic";

const KINDS: Record<string, { kind: SubmissionKind; heading: string; back: string; intro: string }> = {
  listing: {
    kind: "LISTING",
    heading: "Add a new listing",
    back: "/portal",
    intro: "Tell us about the business or attraction. The team will check it and publish it on visitsomerset.co.uk.",
  },
  event: {
    kind: "EVENT",
    heading: "Add an event",
    back: "/portal/events",
    intro: "Events go live on the Festivals and Events section once the team has approved them.",
  },
  news: {
    kind: "NEWS",
    heading: "Add a news story",
    back: "/portal/news",
    intro:
      "Once the team approves it, your story goes straight into the right month of the Visit Somerset news, based on the date of release.",
  },
  offer: {
    kind: "OFFER",
    heading: "Add an offer",
    back: "/portal/offers",
    intro: "Offers appear on your listing page once the team has approved them.",
  },
};

export default async function SubmitPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ id?: string; listing?: string }>;
}) {
  const { kind: kindParam } = await params;
  const { id, listing } = await searchParams;
  const meta = KINDS[kindParam];
  if (!meta) notFound();

  const session = await auth();
  const userId = session!.user.id;

  let initial = sanitise(meta.kind, listing ? { pageId: listing } : {});
  let status: string | null = null;
  let note: string | null = null;
  if (id) {
    const existing = await prisma.submission.findFirst({
      where: { id, authorId: userId, kind: meta.kind, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
    });
    if (!existing) notFound();
    initial = parseData(meta.kind, existing.data);
    status = existing.status;
    note = existing.note;
  }

  const listings =
    meta.kind === "OFFER"
      ? await prisma.page.findMany({
          where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : [];

  return (
    <div className="max-w-3xl">
      <Link href={meta.back} className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <h1 className="font-serif text-3xl font-black text-stone-900">{meta.heading}</h1>
      <p className="mt-1 mb-5 text-stone-600">{meta.intro}</p>
      <SubmissionForm kind={meta.kind} initial={initial} id={id ?? null} status={status} note={note} listings={listings} />
    </div>
  );
}
