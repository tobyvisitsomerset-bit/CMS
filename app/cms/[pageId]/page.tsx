import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPageById } from "@/lib/data/pages";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { canAccessPage, hasCapability, isAdmin } from "@/lib/permissions";
import { EditorShell } from "@/components/cms/page-editor/editor-shell";

export default async function PageEditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const page = await getPageById(pageId);
  if (!page) notFound();

  const { roleKey, id } = session.user;
  const allowed = canAccessPage(roleKey, id, page);

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400">
        <p className="text-sm">You don&apos;t have access to this page.</p>
      </div>
    );
  }

  const canEdit = roleKey !== "READ_ONLY" && hasCapability(roleKey, "pages.edit");
  const canPublish = hasCapability(roleKey, "pages.publish");
  const canArchive = hasCapability(roleKey, "pages.archive");
  const canReview = hasCapability(roleKey, "workflow.review");
  const listings = await getAllListingsGrouped();

  return (
    <EditorShell
      page={page}
      canEdit={canEdit}
      canPublish={canPublish}
      canArchive={canArchive}
      canReview={canReview}
      isMember={!isAdmin(roleKey)}
      listings={listings}
    />
  );
}
