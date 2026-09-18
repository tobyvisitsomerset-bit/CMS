import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { NAV_LINKS } from "@/lib/site-nav";
import { TripProvider } from "@/lib/trip-context";
import { TripNavBadge } from "@/components/trip/trip-nav-badge";
import { getSocialLinks, getNavMenus } from "@/lib/data/pages";
import { SocialIcon } from "@/components/site/social-icon";
import { NavMenuItem } from "@/components/site/nav-menu-item";

// Real routes only — no invented sub-links (e.g. "Hotels"/"B&Bs" are filter
// chips inside /places-to-stay, not separate pages, so they're correctly
// left out here).
const FOOTER_COLUMNS = [
  {
    heading: "Discover",
    links: [
      { label: "Discover Somerset", href: "/discover-somerset" },
      { label: "Somerset Stories", href: "/somerset-stories" },
      { label: "Map", href: "/interactive-map" },
    ],
  },
  {
    heading: "Plan your visit",
    links: [
      { label: "Places To Stay", href: "/places-to-stay" },
      { label: "Things To Do", href: "/things-to-do" },
      { label: "Food & Drink", href: "/things-to-do/food-drink-more" },
      { label: "Festivals & Events", href: "/festivals-events" },
    ],
  },
  {
    heading: "Somerset towns",
    links: [
      { label: "Bath", href: "/bath" },
      { label: "Taunton", href: "/taunton" },
    ],
  },
  {
    heading: "Your visit",
    links: [{ label: "My Trip", href: "/my-trip" }],
  },
];

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [session, socialLinks, navMenus] = await Promise.all([
    auth(),
    getSocialLinks(),
    getNavMenus(NAV_LINKS.filter((l) => l.slug !== "interactive-map" && l.slug !== "my-trip").map((l) => l.slug)),
  ]);

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
              {NAV_LINKS.map((link) =>
                link.slug === "my-trip" ? (
                  <Link
                    key={link.slug}
                    href={`/${link.slug}`}
                    className="flex items-center gap-1.5 rounded-full bg-damson px-4 py-1.5 text-white transition-colors hover:opacity-90"
                  >
                    {link.label}
                    <TripNavBadge />
                  </Link>
                ) : (
                  <NavMenuItem key={link.slug} label={link.label} href={`/${link.slug}`} items={navMenus[link.slug] ?? []} />
                ),
              )}
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-deep-green">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.heading}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{col.heading}</h3>
                <ul className="mt-3 space-y-2">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-white/80 hover:text-white hover:underline">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-white/10 px-6 py-8 text-sm text-white/70 sm:flex-row">
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
