import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { NAV_LINKS } from "@/lib/site-nav";
import { TripProvider } from "@/lib/trip-context";
import { TripNavBadge } from "@/components/trip/trip-nav-badge";
import { getSocialLinks } from "@/lib/data/pages";
import { SocialIcon } from "@/components/site/social-icon";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, socialLinks] = await Promise.all([auth(), getSocialLinks()]);

  return (
    <TripProvider>
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
                <Link
                  key={link.slug}
                  href={`/${link.slug}`}
                  className="flex items-center gap-1.5 transition-colors hover:text-somerset-green"
                >
                  {link.label}
                  {link.slug === "my-trip" && <TripNavBadge />}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-deep-green">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-white/70 sm:flex-row">
            <p>&copy; {new Date().getFullYear()} Visit Somerset.</p>
            {socialLinks.length > 0 && (
              <div className="flex items-center gap-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={link.platform}
                    className="text-white/70 transition-colors hover:text-white"
                  >
                    <SocialIcon platform={link.platform} className="size-4" />
                  </a>
                ))}
              </div>
            )}
            <Link href={session?.user ? "/cms" : "/login"} className="text-white hover:underline">
              {session?.user ? "Content Hub" : "Staff sign in"}
            </Link>
          </div>
        </footer>
      </div>
    </TripProvider>
  );
}
