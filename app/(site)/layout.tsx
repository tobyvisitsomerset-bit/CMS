import Link from "next/link";
import { auth } from "@/lib/auth";
import { NAV_LINKS } from "@/lib/site-nav";
import { TripProvider } from "@/lib/trip-context";
import { getSocialLinks, getAllMegaMenus } from "@/lib/data/pages";
import { SocialIcon } from "@/components/site/social-icon";
import { SiteHeader } from "@/components/site/site-header";

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
  const [session, socialLinks, megaMenus] = await Promise.all([
    auth(),
    getSocialLinks(),
    getAllMegaMenus(NAV_LINKS.filter((l) => l.slug !== "interactive-map" && l.slug !== "my-trip").map((l) => l.slug)),
  ]);

  return (
    <TripProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <SiteHeader navLinks={NAV_LINKS} megaMenus={megaMenus} />

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
