import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasCapability } from "@/lib/permissions";
import { emailConfigured } from "@/lib/email";
import { UsersManager } from "@/components/cms/users/users-manager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasCapability(session.user.roleKey, "members.manage")) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">You don&apos;t have access to users.</div>;
  }

  const users = await prisma.user.findMany({
    where: { role: { key: { not: "VISITOR" } } },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      role: { select: { key: true, name: true } },
      assignedPages: { select: { id: true, title: true }, orderBy: { title: "asc" } },
    },
    orderBy: [{ role: { key: "asc" } }, { name: "asc" }],
  });
  const visitors = await prisma.user.count({ where: { role: { key: "VISITOR" } } });

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Create accounts for members and for the team, assign members to their pages and send them their sign-in details.
        {visitors > 0 ? ` ${visitors} visitor account${visitors === 1 ? "" : "s"} are not listed here.` : ""}
      </p>
      <UsersManager
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          roleKey: u.role.key,
          roleName: u.role.name,
          pages: u.assignedPages,
          createdAt: u.createdAt.toISOString(),
        }))}
        emailReady={emailConfigured()}
        isSuperAdmin={session.user.roleKey === "SUPER_ADMIN"}
        meId={session.user.id}
      />
    </div>
  );
}
