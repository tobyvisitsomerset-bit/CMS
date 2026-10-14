import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getAssignedPageTree, getFullPageTree } from "@/lib/data/pages";
import { hasCapability, isAdmin } from "@/lib/permissions";
import { CmsShell } from "@/components/cms/cms-shell";
import { TripProvider } from "@/lib/trip-context";

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
    // The Page tab renders the real public components, some of which use the
    // visitor trip store — give the editor the same provider.
    <TripProvider>
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
    </TripProvider>
  );
}
