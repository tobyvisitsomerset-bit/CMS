import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "@/app/cms/auth-actions";
import { PortalTabs } from "@/components/portal/portal-tabs";

export const dynamic = "force-dynamic";

// The Member Portal lives inside the public site: same domain, same sign-in,
// same database. Members propose changes here; the team approves them.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.roleKey !== "MEMBER") redirect("/cms");

  const owned = await prisma.page.findMany({ where: { assignedMemberId: session.user.id }, select: { id: true } });
  const newEnquiries = owned.length
    ? await prisma.bookingRequest.count({ where: { status: "NEW", pageId: { in: owned.map((p) => p.id) } } })
    : 0;

  return (
    <div className="bg-cool-grey/50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-somerset-green">Member Portal</p>
            <p className="text-sm text-neutral-500">{session.user.name}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-neutral-600 hover:underline">
              Visit the site
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="font-medium text-damson hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
        <PortalTabs newEnquiries={newEnquiries} />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
