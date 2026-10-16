import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRequest, parseProposal, proposalFromPage } from "@/lib/data/change-requests";
import { levelLabel } from "@/lib/membership";
import { labelForSlugSegment } from "@/lib/site-nav";
import { EditForm } from "./edit-form";
import { getLandingOptions, homeLandingIds, placementCap, placementsFor } from "@/lib/data/placements";
import { getListingAccess } from "@/lib/accessibility";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const page = await prisma.page.findFirst({
    where: { id, assignedMemberId: userId, status: { not: "ARCHIVED" } },
    include: { rooms: { orderBy: { sortOrder: "asc" } }, tags: { select: { name: true } } },
  });
  if (!page) notFound();

  const tagRows = await prisma.tag.findMany({ select: { name: true }, orderBy: { name: "asc" }, take: 60 });
  const [landings, placed, home] = await Promise.all([getLandingOptions(), placementsFor(id), homeLandingIds(id)]);
  const live = proposalFromPage({ ...page, placements: placed });
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
        initialTab={tab}
        pageId={id}
        title={page.title}
        slug={page.slug}
        section={labelForSlugSegment(page.slug.split("/")[0])}
        tierLabel={levelLabel(page.membershipTier)}
        tagOptions={tagRows.map((t) => t.name)}
        detectedAccess={getListingAccess(page.customFields).features}
        landingOptions={landings.filter((l) => l.id !== id).map((l) => ({ id: l.id, title: l.title, context: l.context }))}
        homeIds={home}
        placementCap={placementCap(page.membershipTier)}
        published={page.status === "PUBLISHED"}
        live={live}
        initial={saved ?? live}
        requestStatus={request?.status ?? null}
        rejectionNote={request?.status === "REJECTED" ? request.note : null}
      />
    </div>
  );
}
