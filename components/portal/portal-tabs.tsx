"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/portal", label: "My listings", match: (p: string) => p === "/portal" || p.startsWith("/portal/listing") },
  { href: "/portal/enquiries", label: "Enquiries", match: (p: string) => p.startsWith("/portal/enquiries") },
  { href: "/portal/account", label: "Account", match: (p: string) => p.startsWith("/portal/account") },
];

export function PortalTabs({ newEnquiries }: { newEnquiries: number }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 border-b" aria-label="Member portal">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium",
              active ? "border-somerset-green text-somerset-green" : "border-transparent text-neutral-600 hover:text-neutral-900",
            )}
          >
            {t.label}
            {t.label === "Enquiries" && newEnquiries > 0 && (
              <span className="ml-2 rounded-full bg-damson px-1.5 py-0.5 text-[10px] font-bold text-white">{newEnquiries}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
