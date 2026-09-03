import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssignedPageTree, getFullPageTree } from "@/lib/data/pages";
import { hasCapability, isAdmin } from "@/lib/permissions";
import { CmsShell } from "@/components/cms/cms-shell";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { roleKey, roleName, name, id } = session.user;
  const flatMember = roleKey === "MEMBER";
  const tree = flatMember ? await getAssignedPageTree(id) : await getFullPageTree();

  const caps = {
    canCreate: hasCapability(roleKey, "pages.create"),
    canClone: hasCapability(roleKey, "pages.clone"),
    canArchive: hasCapability(roleKey, "pages.archive"),
    canDelete: hasCapability(roleKey, "pages.delete"),
    canReorder: hasCapability(roleKey, "pages.reorder") && isAdmin(roleKey),
  };

  return (
    <CmsShell
      user={{ name: name ?? "User", roleName }}
      tree={tree}
      caps={caps}
      flatMember={flatMember}
      canManageMedia={hasCapability(roleKey, "media.upload")}
      canReviewWorkflow={hasCapability(roleKey, "workflow.review")}
    >
      {children}
    </CmsShell>
  );
}
