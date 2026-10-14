import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { listPendingApprovalsAction } from "@/app/cms/actions";
import { diffProposal, parseProposal, proposalFromPage } from "@/lib/data/change-requests";
import { ApprovalsList } from "@/components/cms/approvals/approvals-list";
import { ChangeRequestsList, type ChangeItem } from "@/components/cms/approvals/change-requests-list";

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
      include: { rooms: { orderBy: { sortOrder: "asc" } } },
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
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Pages submitted for review</h2>
        <ApprovalsList pages={pages} />
      </div>
    </div>
  );
}
