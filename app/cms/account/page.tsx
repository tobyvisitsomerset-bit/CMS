import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PasswordCard } from "@/app/(site)/account/password-card";

export const dynamic = "force-dynamic";

export default async function StaffAccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">My account</h1>
      <p className="mb-5 text-sm text-neutral-500">
        {session.user.name} · {session.user.email} · {session.user.roleName}
      </p>
      <PasswordCard />
    </div>
  );
}
