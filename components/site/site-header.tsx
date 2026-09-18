"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TripNavBadge } from "@/components/trip/trip-nav-badge";
import type { MegaMenuColumn } from "@/lib/data/pages";

// Full-width mega-menu panel shared by the whole header (Phase 11) — matches
// the real visitsomerset.co.uk site's actual layout, confirmed by inspecting
// it directly: one full-bleed band below the entire header whose content
// swaps with whichever nav item is hovered, not a narrow popup anchored
// under a single word (which is what Phase 10 built). Hover-open/close-delay
// timing carried over unchanged from Phase 10's per-item version.
const CLOSE_DELAY_MS = 150;

export function SiteHeader({
  navLinks,
  megaMenus,
}: {
  navLinks: { label: string; slug: string }[];
  megaMenus: Record<string, MegaMenuColumn[]>;
}) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
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
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur" onMouseLeave={closeSoon}>
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
          {navLinks.map((link) => {
            if (link.slug === "my-trip") {
              return (
                <Link
                  key={link.slug}
                  href={`/${link.slug}`}
                  className="flex items-center gap-1.5 rounded-full bg-damson px-4 py-1.5 text-white transition-colors hover:opacity-90"
                >
                  {link.label}
                  <TripNavBadge />
                </Link>
              );
            }
            const hasMenu = (megaMenus[link.slug]?.length ?? 0) > 0;
            return (
              <Link
                key={link.slug}
                href={`/${link.slug}`}
                className="flex items-center gap-1 transition-colors hover:text-somerset-green"
                onMouseEnter={() => hasMenu && openNow(link.slug)}
                onFocus={() => hasMenu && openNow(link.slug)}
              >
                {link.label}
                {hasMenu && (
                  <ChevronDown className={cn("size-3.5 transition-transform", activeSlug === link.slug && "rotate-180")} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {activeColumns.length > 0 && (
        <div
          className="absolute inset-x-0 top-full border-t border-white/10 bg-deep-green shadow-xl"
          onMouseEnter={() => activeSlug && openNow(activeSlug)}
        >
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-10 gap-y-6 px-6 py-8">
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
                // (e.g. Festivals & Events' uncategorised leaf pages) wraps
                // within the panel's real width instead of spilling into an
                // ever-wider row of columns — confirmed this was a genuine
                // overflow bug before the fix (46 items pushed the panel to
                // 2.7x the viewport width).
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
