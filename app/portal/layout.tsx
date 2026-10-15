import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "@/app/cms/auth-actions";
import { PortalNav } from "@/components/portal/portal-nav";

export const dynamic = "force-dynamic";

export const metadata = { title: "Member portal | Visit Somerset" };

// The Member Portal is its own application inside the same system: its own
// header and navigation (not the public website's), the same sign-in and the
// same database. Members propose changes here; the team approves them.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.roleKey !== "MEMBER") redirect("/cms");

  const owned = await prisma.page.findMany({
    where: { assignedMemberId: session.user.id, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const newEnquiries = owned.length
    ? await prisma.bookingRequest.count({ where: { status: "NEW", pageId: { in: owned.map((p) => p.id) } } })
    : 0;

  const label = owned[0]?.title ?? session.user.name ?? "Member";
  const initials =
    label
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "M";

  return (
    <div className="min-h-screen bg-[#fafaf8] text-stone-900">
      <header className="bg-somerset-green text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Link href="/portal" className="flex shrink-0 items-center gap-3">
            <Image
              src="/logo-visit-somerset.png"
              alt="Visit Somerset"
              width={419}
              height={113}
              priority
              className="h-8 w-auto brightness-0 invert"
            />
            <span className="hidden h-5 w-px bg-white/30 sm:block" />
            <span className="hidden text-[11px] font-semibold tracking-[0.18em] text-white/80 uppercase sm:block">Member portal</span>
          </Link>

          <PortalNav newEnquiries={newEnquiries} />

          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/80 sm:block">{label}</span>
            <span className="flex size-8 items-center justify-center rounded-full bg-white text-xs font-bold text-somerset-green">{initials}</span>
            <form action={signOutAction}>
              <button type="submit" className="text-xs font-medium text-white/80 underline-offset-2 hover:text-white hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

      <footer className="border-t border-stone-200 py-6 text-center text-xs text-stone-500">
        Visit Somerset member portal ·{" "}
        <Link href="/" className="underline-offset-2 hover:underline">
          Back to visitsomerset.co.uk
        </Link>
      </footer>
    </div>
  );
}
