import Link from "next/link";
import { SocialIcon } from "@/components/site/social-icon";
import { NewsletterForm } from "@/components/site/newsletter-form";
import type { SocialLink } from "@/lib/data/pages";
import type { MasterSettings } from "@/lib/data/site-settings";

export function SiteFooter({
  socialLinks,
  signedIn,
  master,
}: {
  socialLinks: SocialLink[];
  signedIn: boolean;
  master: MasterSettings;
}) {
  return (
    <footer className="bg-white">
      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="flex flex-col gap-5 rounded-[2rem] bg-cool-grey px-8 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-2xl font-black text-stone-900">{master.newsletterTitle}</p>
            <p className="mt-1 text-sm text-stone-600">{master.newsletterText}</p>
          </div>
          <NewsletterForm source="footer" tone="light" />
        </div>
      </div>

      <div className="rounded-t-[2rem] bg-deep-green">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-14 gap-y-10 px-6 py-12">
          <div className="max-w-xs md:mr-auto">
            <p className="font-serif text-3xl font-black text-white">
              <span className="mr-2 rounded bg-white/15 px-1.5 py-0.5 align-middle font-sans text-[10px] font-bold tracking-widest">VISIT</span>
              Somerset
            </p>
            <p className="mt-3 max-w-xs text-sm text-white/75">{master.footerTagline}</p>
          </div>
          {master.footerColumns.map((col) => (
            <div key={col.heading} className="min-w-[8rem]">
              <h3 className="text-sm font-bold text-white">{col.heading}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
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
                {master.legalLinks.map((l) => (
                  <Link key={l.href + l.label} href={l.href} className="hover:text-white hover:underline">
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
