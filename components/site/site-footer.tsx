import Link from "next/link";
import { SocialIcon } from "@/components/site/social-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
import type { SocialLink } from "@/lib/data/pages";

type FooterLink = { label: string; href: string };

// Real routes only — every link is a real route, a real published page or a
// real filter on a landing page.
function columns(submitEventHref: string): { heading: string; links: FooterLink[] }[] {
  return [
    {
      heading: "Discover",
      links: [
        { label: "Inspiration", href: "/discover-somerset/inspiration" },
        { label: "Popular towns", href: "/discover-somerset/popular-somerset-towns" },
        { label: "Travel", href: "/discover-somerset/travel" },
        { label: "Plan your visit", href: "/discover-somerset/plan-your-visit" },
        { label: "Interactive map", href: "/interactive-map" },
      ],
    },
    {
      heading: "Things to do",
      links: [
        { label: "Attractions", href: "/things-to-do/attractions" },
        { label: "Activities", href: "/things-to-do/activities" },
        { label: "Food & drink", href: "/things-to-do/food-drink-more" },
        { label: "Family days out", href: "/things-to-do?q=family" },
        { label: "Buy Somerset", href: "/buy-somerset" },
      ],
    },
    {
      heading: "Stay",
      links: [
        { label: "Hotels", href: "/places-to-stay?type=hotels" },
        { label: "B&Bs", href: "/places-to-stay?type=b-bs-guest-houses" },
        { label: "Self-catering", href: "/places-to-stay?type=self-catering" },
        { label: "Camping & glamping", href: "/places-to-stay?type=camping-holiday-parks" },
        { label: "Book experiences", href: "/book-experiences" },
      ],
    },
    {
      heading: "Business",
      links: [
        { label: "Membership", href: "/business/membership-advertising" },
        { label: "Submit an event", href: submitEventHref },
        { label: "Media & press", href: "/media" },
        { label: "News", href: "/news" },
        { label: "Contact us", href: "/contact-us" },
      ],
    },
  ];
}

const LEGAL: FooterLink[] = [
  { label: "Terms of use", href: "/terms-of-use" },
  { label: "Cookie policy", href: "/cookie-policy" },
  { label: "Accessibility", href: "/accessibility" },
  { label: "Site map", href: "/site-map" },
];

export function SiteFooter({
  socialLinks,
  signedIn,
  submitEventHref,
}: {
  socialLinks: SocialLink[];
  signedIn: boolean;
  submitEventHref: string;
}) {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-col gap-5 rounded-[2rem] bg-cool-grey px-8 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-2xl font-black text-stone-900">The Somerset newsletter</p>
            <p className="mt-1 text-sm text-stone-600">What&apos;s on, where to stay and a little folklore. Monthly, never more.</p>
          </div>
          <NewsletterForm source="footer" tone="light" />
        </div>
      </div>

      <div className="rounded-t-[2rem] bg-deep-green">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div>
            <p className="font-serif text-3xl font-black text-white">
              <span className="mr-2 rounded bg-white/15 px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold tracking-widest">VISIT</span>
              Somerset
            </p>
            <p className="mt-3 max-w-xs text-sm text-white/75">The official destination site for Somerset, from Bath to Exmoor.</p>
          </div>
          {columns(submitEventHref).map((col) => (
            <div key={col.heading}>
              <h3 className="text-sm font-bold text-white">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-sm text-white/75 hover:text-white hover:underline">
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
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <p>&copy; {new Date().getFullYear()} Visit Somerset</p>
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
            </div>
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
