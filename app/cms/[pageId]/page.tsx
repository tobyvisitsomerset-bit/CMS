import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPageById, getNearbyPages, getChildPages } from "@/lib/data/pages";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { resolveBlockData } from "@/lib/data/block-data";
import { listMembers } from "@/lib/data/users";
import { canAccessPage, hasCapability, isAdmin } from "@/lib/permissions";
import { EditorShell } from "@/components/cms/page-editor/editor-shell";

export default async function PageEditorPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const page = await getPageById(pageId);
  if (!page) notFound();

  // This tree location is just a link to another page's real content (mirrors
  // Kentico's linked-document pattern) — edit the original instead.
  if (page.linkedPageId) redirect(`/cms/${page.linkedPageId}`);

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
  const canManageMembers = hasCapability(roleKey, "members.manage");
  const listings = await getAllListingsGrouped();
  const nearby = await getNearbyPages(page.id, page.parentId);
  const childPages = page.contentBlocks.length === 0 ? await getChildPages(page.id) : [];
  const blockData = await resolveBlockData(page.contentBlocks);
  const members = canManageMembers ? await listMembers() : [];

  return (
    <EditorShell
      page={page}
      canEdit={canEdit}
      canPublish={canPublish}
      canArchive={canArchive}
      canReview={canReview}
      isMember={!isAdmin(roleKey)}
      listings={listings}
      nearby={nearby}
      childPages={childPages}
      blockData={blockData}
      members={members}
      canManageMembers={canManageMembers}
    />
  );
}
