"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ChildPageTile } from "@/lib/data/pages";

// Mega-menu nav item: the label is always a real, immediately-navigable
// <Link> (never a dead click), with a hover-opened dropdown of that
// section's real child pages layered on top — mirrors the real
// visitsomerset.co.uk "Discover Somerset" mega-menu. No hover-open pattern
// existed anywhere in this codebase before this; the notifications bell
// (components/cms/page-editor/notifications-bell.tsx) established the
// controlled open/onOpenChange + render-prop-trigger wiring this reuses,
// just hover- instead of click-initiated.
const CLOSE_DELAY_MS = 150;

export function NavMenuItem({ label, href, items }: { label: string; href: string; items: ChildPageTile[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  if (items.length === 0) {
    return (
      <Link href={href} className="flex items-center gap-1.5 transition-colors hover:text-somerset-green">
        {label}
      </Link>
    );
  }

  return (
    <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger
          render={
            <Link
              href={href}
              className="flex items-center gap-1 transition-colors hover:text-somerset-green"
              onFocus={openNow}
            >
              {label}
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
            </Link>
          }
        />
        <DropdownMenuContent
          align="start"
          sideOffset={12}
          className="w-64 p-2"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
        >
          {items.map((child) => (
            <Link
              key={child.id}
              href={`/${child.slug}`}
              className="block rounded-md px-3 py-2 text-sm text-stone-600 transition-colors hover:bg-somerset-green/10 hover:text-somerset-green"
            >
              {child.title}
            </Link>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
