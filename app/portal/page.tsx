import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { signOutAction } from "@/app/cms/auth-actions";
import { Button } from "@/components/ui/button";

export default async function PortalHome() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-neutral-50 px-4 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-800 font-serif text-white">
        VS
      </div>
      <h1 className="text-lg font-semibold">Member Portal</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        Signed in as {session.user.name} ({session.user.roleName}). My Listings, Advertising, Documents,
        Opportunities and the Performance Dashboard arrive in Phase 3, reading from the same CMS records
        you edit — no duplicate content storage.
      </p>
      <div className="flex gap-2">
        <Button render={<Link href="/cms">Back to CMS</Link>} variant="outline" />
        <form action={signOutAction}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
