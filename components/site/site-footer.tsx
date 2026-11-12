import Link from "next/link";
import { SocialIcon } from "@/components/site/social-icon";
import type { SocialLink } from "@/lib/data/pages";
import type { MasterSettings } from "@/lib/data/site-settings";

// A light, single-line footer as on the current site: the copyright, the legal
// links (edited in the Master page tab) and round social icons. The link
// columns and newsletter strip that used to sit above it are no longer shown;
// their settings are untouched in the Master page tab.
export function SiteFooter({
  socialLinks,
  signedIn,
  master,
}: {
  socialLinks: SocialLink[];
  signedIn: boolean;
  master: MasterSettings;
}) {
  const linkClass = "text-somerset-green hover:underline";
  return (
    <footer className="bg-cool-grey">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col items-center justify-between gap-4 text-sm text-stone-700 md:flex-row">
          <p>&copy; {new Date().getFullYear()} Visit Somerset</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Legal">
            {master.legalLinks.map((l) => (
              <Link key={l.href + l.label} href={l.href} {...(l.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})} className={linkClass}>
                {l.label}
                {l.newTab && <span className="sr-only"> (opens in a new tab)</span>}
              </Link>
            ))}
            <Link href={signedIn ? "/cms" : "/login"} className={linkClass}>
              {signedIn ? "Content Hub" : "Staff sign in"}
            </Link>
          </nav>
        </div>
        {socialLinks.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            {socialLinks.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`${link.platform} (opens in a new tab)`}
                className="flex size-10 items-center justify-center rounded-full bg-damson text-white transition-opacity hover:opacity-85"
              >
                <SocialIcon platform={link.platform} className="size-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
