import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { listPendingApprovalsAction } from "@/app/cms/actions";
import { ApprovalsList } from "@/components/cms/approvals/approvals-list";

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

  const pages = await listPendingApprovalsAction();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-xl font-semibold">Approvals</h1>
      <p className="mb-4 text-sm text-neutral-500">Content waiting for review before it can go live.</p>
      <ApprovalsList pages={pages} />
    </div>
  );
}
