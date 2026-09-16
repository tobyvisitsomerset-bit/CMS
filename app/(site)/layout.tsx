import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";

// Only the real, currently-PUBLISHED top-level sections — the tree also has
// ~33 stray unmerged Kentico root nodes (Zesty, Extranet, etc.) that aren't
// real navigation and a "Experiences" hub that's still DRAFT. Hardcoded
// rather than derived from the tree until that cleanup happens.
const NAV_LINKS = [
  { label: "Places To Stay", slug: "places-to-stay" },
  { label: "Things To Do", slug: "things-to-do" },
  { label: "Food & Drink", slug: "food-and-drink" },
  { label: "Festivals & Events", slug: "festivals-and-events" },
  { label: "Somerset Stories", slug: "somerset-stories" },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-visit-somerset.png"
              alt="Visit Somerset"
              width={419}
              height={113}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-stone-600 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.slug} href={`/${link.slug}`} className="transition-colors hover:text-somerset-green">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-deep-green">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-white/70 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Visit Somerset.</p>
          <Link href={session?.user ? "/cms" : "/login"} className="text-white hover:underline">
            {session?.user ? "Content Hub" : "Staff sign in"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
