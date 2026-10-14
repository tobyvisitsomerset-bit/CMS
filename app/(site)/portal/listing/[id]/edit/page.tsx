import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRequest, parseProposal, proposalFromPage } from "@/lib/data/change-requests";
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
    <div className="max-w-3xl">
      <Link href={`/portal/listing/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="size-4" /> {page.title}
      </Link>
      <h1 className="font-serif text-2xl font-bold text-deep-green">Edit {page.title}</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-600">
        Your changes are saved as a draft and only go live once someone at Visit Somerset has approved them. The name,
        web address and membership level are managed by the team.
      </p>
      <EditForm
        pageId={id}
        title={page.title}
        slug={page.slug}
        published={page.status === "PUBLISHED"}
        live={live}
        initial={saved ?? live}
        requestStatus={request?.status ?? null}
        rejectionNote={request?.status === "REJECTED" ? request.note : null}
      />
    </div>
  );
}
