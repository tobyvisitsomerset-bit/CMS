"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, Heart, MapPin, Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripNavBadge } from "@/components/trip/trip-nav-badge";
import type { MegaMenuColumn } from "@/lib/data/pages";

// Header chrome from the mockup pack (screen 01): a green utility strip over
// a white main row, with one shared full-width mega-menu panel below the
// whole header whose content swaps with whichever nav item is hovered.
const CLOSE_DELAY_MS = 150;

type NavItem = { label: string; slug: string };

export function SiteHeader({
  mainNav,
  utilityLinks,
  mapLabel,
  bookLabel,
  bookHref,
  megaMenus,
  account,
}: {
  mainNav: NavItem[];
  utilityLinks: { label: string; href: string }[];
  mapLabel: string;
  bookLabel: string;
  bookHref: string;
  megaMenus: Record<string, MegaMenuColumn[]>;
  account: { href: string; label: string };
}) {
  const mapNav = { label: mapLabel, slug: "interactive-map" };
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveSlug(slug);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setActiveSlug(null), CLOSE_DELAY_MS);
  }

  const activeColumns = activeSlug ? (megaMenus[activeSlug] ?? []) : [];

  return (
    <header className="sticky top-0 z-30 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06)]" onMouseLeave={closeSoon}>
      {/* Utility strip */}
      <div className="bg-somerset-green text-[12px] font-medium text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-1.5">
          <div className="flex items-center gap-5">
            <Link href="/accessibility" className="hover:underline">
              Accessibility
            </Link>
            <span className="hidden text-white/80 sm:inline">English (UK)</span>
          </div>
          <nav className="hidden items-center gap-5 md:flex" aria-label="Utility">
            {utilityLinks.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="hover:underline">
                {l.label}
              </Link>
            ))}
            <Link href="/plan" className="font-semibold hover:underline">
              Plan my trip
            </Link>
            <Link href="/my-trip" className="flex items-center gap-1.5 hover:underline">
              <Heart className="size-3.5" />
              My Trip
              <TripNavBadge />
            </Link>
            <Link href={account.href} className="font-semibold hover:underline">
              {account.label}
            </Link>
          </nav>
          <Link href="/my-trip" className="flex items-center gap-1.5 md:hidden">
            <Heart className="size-3.5" />
            My Trip
            <TripNavBadge />
          </Link>
        </div>
      </div>

      {/* Main row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center">
          <Image src="/logo-visit-somerset.png" alt="Visit Somerset" width={419} height={113} priority className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-6 text-[15px] font-semibold text-stone-900 lg:flex" aria-label="Main">
          {mainNav.map((link) => {
            const hasMenu = (megaMenus[link.slug]?.length ?? 0) > 0;
            return (
              <Link
                key={link.slug}
                href={`/${link.slug}`}
                className={cn(
                  "flex items-center gap-1 py-1 transition-colors hover:text-somerset-green",
                  activeSlug === link.slug && "text-somerset-green",
                )}
                onMouseEnter={() => (hasMenu ? openNow(link.slug) : closeSoon())}
                onFocus={() => hasMenu && openNow(link.slug)}
              >
                {link.label}
                {hasMenu && (
                  <ChevronDown className={cn("size-3.5 transition-transform", activeSlug === link.slug && "rotate-180")} />
                )}
              </Link>
            );
          })}
          <Link
            href={`/${mapNav.slug}`}
            className="flex items-center gap-1.5 py-1 text-somerset-green transition-opacity hover:opacity-80"
            onMouseEnter={closeSoon}
          >
            <MapPin className="size-4" />
            {mapNav.label}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/search"
            aria-label="Search the site"
            className="flex size-10 items-center justify-center rounded-full border border-stone-200 text-stone-700 transition-colors hover:bg-cool-grey"
          >
            <Search className="size-4" />
          </Link>
          <Link
            href={bookHref}
            className="hidden rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:inline-block"
          >
            {bookLabel}
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="flex size-10 items-center justify-center rounded-full border border-stone-200 text-stone-700 lg:hidden"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-stone-200 bg-white px-6 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 text-[15px] font-semibold text-stone-900">
            {[...mainNav, mapNav].map((l) => (
              <Link key={l.slug} href={`/${l.slug}`} onClick={() => setMobileOpen(false)} className="rounded-lg px-2 py-2.5 hover:bg-cool-grey">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-3 text-sm text-stone-600">
            {utilityLinks.map((l) => (
              <Link key={l.href + l.label} href={l.href} onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            ))}
            <Link href={account.href} onClick={() => setMobileOpen(false)}>
              {account.label}
            </Link>
          </div>
          <Link
            href={bookHref}
            onClick={() => setMobileOpen(false)}
            className="mt-4 inline-block rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white"
          >
            {bookLabel}
          </Link>
        </div>
      )}

      {/* Shared mega-menu panel */}
      {activeColumns.length > 0 && (
        <div
          className="absolute inset-x-0 top-full hidden border-t border-white/10 bg-deep-green shadow-xl lg:block"
          onMouseEnter={() => activeSlug && openNow(activeSlug)}
        >
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-10 gap-y-6 px-6 py-8">
            {activeColumns.map((col, i) =>
              col.heading ? (
                <div key={i} className="min-w-[11rem]">
                  <h3 className="mb-3 text-sm font-bold text-white">{col.heading}</h3>
                  <ul className="space-y-2">
                    {col.links.map((l) => (
                      <li key={l.id}>
                        <Link href={`/${l.slug}`} className="text-sm text-white/80 transition-colors hover:text-white hover:underline">
                          {l.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                // flex-wrap (not a rigid grid-flow-col) so a long flat list
                // wraps within the panel's real width instead of spilling.
                <div key={i} className="flex flex-1 flex-wrap content-start gap-x-8 gap-y-2">
                  {col.links.slice(0, 24).map((l) => (
                    <Link
                      key={l.id}
                      href={`/${l.slug}`}
                      className="w-40 text-sm text-white/80 transition-colors hover:text-white hover:underline"
                    >
                      {l.title}
                    </Link>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </header>
  );
}
