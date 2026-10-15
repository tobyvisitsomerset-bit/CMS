import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getFullPageTree } from "@/lib/data/pages";
import { hasCapability, isAdmin } from "@/lib/permissions";
import { CmsShell } from "@/components/cms/cms-shell";
import { TripProvider } from "@/lib/trip-context";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  // Members work in the Member Portal; their edits go to the team for approval.
  if (session.user.roleKey === "MEMBER") redirect("/portal");
  if (session.user.roleKey === "VISITOR") redirect("/account");

  const { roleKey, roleName, name } = session.user;
  const flatMember = false;
  const tree = await getFullPageTree();

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
