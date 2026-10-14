import Link from "next/link";
import { SocialIcon } from "@/components/site/social-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
import type { SocialLink } from "@/lib/data/pages";

// Real routes only — every link below is a real route or a real published
// page in the tree.
const COLUMNS = [
  {
    heading: "Discover",
    links: [
      { label: "Discover Somerset", href: "/discover-somerset" },
      { label: "Things to do", href: "/things-to-do" },
      { label: "Food & drink", href: "/things-to-do/food-drink-more" },
      { label: "Somerset stories", href: "/somerset-stories" },
      { label: "Interactive map", href: "/interactive-map" },
    ],
  },
  {
    heading: "Plan your visit",
    links: [
      { label: "Places to stay", href: "/places-to-stay" },
      { label: "Festivals & events", href: "/festivals-events" },
      { label: "Book experiences", href: "/book-experiences" },
      { label: "Buy Somerset", href: "/buy-somerset" },
      { label: "My Trip", href: "/my-trip" },
    ],
  },
  {
    heading: "Places",
    links: [
      { label: "Bath", href: "/bath" },
      { label: "Taunton", href: "/taunton" },
      { label: "Wells", href: "/discover-somerset/popular-somerset-towns/visiting-wells-in-somerset" },
      { label: "Glastonbury", href: "/discover-somerset/popular-somerset-towns/glastonbury" },
    ],
  },
  {
    heading: "Visit Somerset",
    links: [
      { label: "Business in Somerset", href: "/business" },
      { label: "Media", href: "/media" },
      { label: "News", href: "/news" },
      { label: "Competitions", href: "/competitions" },
      { label: "Contact us", href: "/contact-us" },
    ],
  },
];

const LEGAL = [
  { label: "Accessibility", href: "/accessibility" },
  { label: "Cookie policy", href: "/cookie-policy" },
  { label: "Terms of use", href: "/terms-of-use" },
  { label: "Site map", href: "/site-map" },
];

export function SiteFooter({ socialLinks, signedIn }: { socialLinks: SocialLink[]; signedIn: boolean }) {
  return (
    <footer>
      <div className="bg-somerset-green">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-2xl font-black text-white">Somerset, in your inbox</p>
            <p className="mt-1 text-sm text-white/85">Events, ideas and offers from across the county. Unsubscribe any time.</p>
          </div>
          <NewsletterForm source="footer" />
        </div>
      </div>

      <div className="bg-deep-green">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-12 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h3 className="text-xs font-semibold tracking-wide text-white/60 uppercase">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/85 hover:text-white hover:underline">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-white/70 md:flex-row">
            <p>&copy; {new Date().getFullYear()} Visit Somerset.</p>
            <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2" aria-label="Legal">
              {LEGAL.map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-white hover:underline">
                  {l.label}
                </Link>
              ))}
              <Link href={signedIn ? "/cms" : "/login"} className="hover:text-white hover:underline">
                {signedIn ? "Content Hub" : "Staff sign in"}
              </Link>
            </nav>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
