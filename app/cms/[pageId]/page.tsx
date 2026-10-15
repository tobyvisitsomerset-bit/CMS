import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPageById, getChildPages } from "@/lib/data/pages";
import { getDetailExtras } from "@/lib/data/detail-extras";
import { getMasterSettings } from "@/lib/data/site-settings";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { resolveBlockData } from "@/lib/data/block-data";
import { listMembers } from "@/lib/data/users";
import { canAccessPage, hasCapability, isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { EditorShell } from "@/components/cms/page-editor/editor-shell";
import { isFormDriven } from "@/components/cms/page-editor/page-preview";
import { getListingDiagnostics } from "@/lib/data/listing-diagnostics";
import { getLandingOptions, homeLandingIds, placementCap, placementsFor } from "@/lib/data/placements";

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
  const extras = await getDetailExtras(page);
  const master = await getMasterSettings();
  const childPages = isFormDriven(page) ? await getChildPages(page.id) : [];
  const blockData = await resolveBlockData(page.contentBlocks);
  const members = canManageMembers ? await listMembers() : [];
  const diagnostics = await getListingDiagnostics(page);
  const [landings, placed, homeIds] = await Promise.all([getLandingOptions(), placementsFor(page.id), homeLandingIds(page.id)]);
  const offers = await prisma.offer.findMany({ where: { pageId: page.id }, orderBy: { createdAt: "desc" } });

  return (
    <EditorShell
      page={page}
      canEdit={canEdit}
      canPublish={canPublish}
      canArchive={canArchive}
      canReview={canReview}
      isMember={!isAdmin(roleKey)}
      listings={listings}
      extras={extras}
      master={master}
      childPages={childPages}
      blockData={blockData}
      members={members}
      diagnostics={diagnostics}
      placementData={{ options: landings.filter((l) => l.id !== page.id).map((l) => ({ id: l.id, title: l.title, context: l.context })), selected: placed, homeIds, cap: placementCap(page.membershipTier) }}
      offers={offers.map((o) => ({ id: o.id, title: o.title, description: o.description, validFrom: o.validFrom?.toISOString() ?? null, validTo: o.validTo?.toISOString() ?? null }))}
      canManageMembers={canManageMembers}
    />
  );
}
