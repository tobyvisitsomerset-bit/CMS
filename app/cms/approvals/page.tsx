import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { listPendingApprovalsAction } from "@/app/cms/actions";
import { diffProposal, parseProposal, proposalFromPage } from "@/lib/data/change-requests";
import { ApprovalsList } from "@/components/cms/approvals/approvals-list";
import { ChangeRequestsList, type ChangeItem } from "@/components/cms/approvals/change-requests-list";
import { SubmissionsList, type SubmissionItem, type AdRequestItem } from "@/components/cms/approvals/submissions-list";
import { describe, parseData, type SubmissionKind } from "@/lib/data/submissions";
import { placementByKey, formatPence } from "@/lib/ad-spaces";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasCapability(session.user.roleKey, "workflow.review")) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-400">
        You don&apos;t have access to the approvals queue.
      </div>
    );
  }

  const [pages, requests] = await Promise.all([
    listPendingApprovalsAction(),
    prisma.changeRequest.findMany({ where: { status: "SUBMITTED" }, orderBy: { submittedAt: "asc" } }),
  ]);

  const [livePages, authors] = await Promise.all([
    prisma.page.findMany({
      where: { id: { in: requests.map((r) => r.pageId) } },
      include: { rooms: { orderBy: { sortOrder: "asc" } }, tags: { select: { name: true } } },
    }),
    prisma.user.findMany({ where: { id: { in: requests.map((r) => r.authorId) } }, select: { id: true, name: true } }),
  ]);

  const items: ChangeItem[] = [];
  for (const r of requests) {
    const page = livePages.find((p) => p.id === r.pageId);
    const proposal = parseProposal(r.proposal);
    if (!page || !proposal) continue;
    items.push({
      id: r.id,
      pageId: page.id,
      pageTitle: page.title,
      pageSlug: page.slug,
      author: authors.find((a) => a.id === r.authorId)?.name ?? "A member",
      submittedAt: (r.submittedAt ?? r.updatedAt).toISOString(),
      changes: diffProposal(proposalFromPage(page), proposal),
    });
  }

  const [subs, adRows] = await Promise.all([
    prisma.submission.findMany({ where: { status: "SUBMITTED" }, orderBy: { submittedAt: "asc" } }),
    prisma.adSlotBooking.findMany({ where: { status: "REQUESTED" }, orderBy: { createdAt: "asc" } }),
  ]);
  const people = await prisma.user.findMany({
    where: { id: { in: [...subs.map((x) => x.authorId), ...adRows.map((x) => x.memberId)] } },
    select: { id: true, name: true },
  });
  const nameOf = (id: string) => people.find((x) => x.id === id)?.name ?? "A member";

  const submissionItems: SubmissionItem[] = subs.map((x) => ({
    id: x.id,
    kind: x.kind as SubmissionKind,
    title: x.title,
    author: nameOf(x.authorId),
    submittedAt: (x.submittedAt ?? x.updatedAt).toISOString(),
    rows: describe(x.kind as SubmissionKind, parseData(x.kind as SubmissionKind, x.data)),
  }));

  const listingTitles = await prisma.page.findMany({
    where: { id: { in: adRows.map((x) => x.pageId) } },
    select: { id: true, title: true },
  });
  const byRef = new Map<string, AdRequestItem>();
  for (const r of adRows) {
    const item = byRef.get(r.ref) ?? {
      ref: r.ref,
      author: nameOf(r.memberId),
      listing: listingTitles.find((t) => t.id === r.pageId)?.title ?? "Listing",
      placements: [] as string[],
      weeks: [] as string[],
      amount: "",
      poNumber: r.poNumber,
      requestedAt: r.createdAt.toISOString(),
    };
    const label = placementByKey(r.placement)?.label ?? r.placement;
    if (!item.placements.includes(label)) item.placements.push(label);
    if (!item.weeks.includes(r.weekStart)) item.weeks.push(r.weekStart);
    byRef.set(r.ref, item);
  }
  for (const [ref, item] of byRef) {
    const total = adRows.filter((r) => r.ref === ref).reduce((sum, r) => sum + r.pricePence, 0);
    item.amount = `${formatPence(total)} before discount and VAT`;
    item.weeks.sort();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Approvals</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Member edits are held here until someone on the team approves them. Nothing changes on the live site before then.
        </p>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Member edits</h2>
        <ChangeRequestsList items={items} />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">New listings, events and offers</h2>
        <SubmissionsList items={submissionItems} ads={[...byRef.values()]} />
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Pages submitted for review</h2>
        <ApprovalsList pages={pages} />
      </div>
    </div>
  );
}
