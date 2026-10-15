import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRequest, parseProposal, proposalFromPage } from "@/lib/data/change-requests";
import { levelLabel } from "@/lib/membership";
import { labelForSlugSegment } from "@/lib/site-nav";
import { EditForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const page = await prisma.page.findFirst({
    where: { id, assignedMemberId: userId, status: { not: "ARCHIVED" } },
    include: { rooms: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) notFound();

  const live = proposalFromPage(page);
  const request = await getActiveRequest(id, userId);
  const saved = request ? parseProposal(request.proposal) : null;

  return (
    <div className="max-w-4xl">
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900">
        <ArrowLeft className="size-4" /> My listings
      </Link>
      <h1 className="font-serif text-3xl font-black text-stone-900">Editing: {page.title}</h1>
      <p className="mt-1 mb-5 text-stone-600">Changes go live once we have approved them. Your live page stays as it is until then.</p>
      <EditForm
        pageId={id}
        title={page.title}
        slug={page.slug}
        section={labelForSlugSegment(page.slug.split("/")[0])}
        tierLabel={levelLabel(page.membershipTier)}
        published={page.status === "PUBLISHED"}
        live={live}
        initial={saved ?? live}
        requestStatus={request?.status ?? null}
        rejectionNote={request?.status === "REJECTED" ? request.note : null}
      />
    </div>
  );
}
