"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/portal", label: "My listings", match: (p: string) => p === "/portal" || p.startsWith("/portal/listing") },
  { href: "/portal/enquiries", label: "Enquiries", match: (p: string) => p.startsWith("/portal/enquiries") },
  { href: "/portal/photos", label: "Photos", match: (p: string) => p.startsWith("/portal/photos") },
  { href: "/portal/membership", label: "Membership", match: (p: string) => p.startsWith("/portal/membership") },
  { href: "/portal/account", label: "Account", match: (p: string) => p.startsWith("/portal/account") },
];

export function PortalNav({ newEnquiries }: { newEnquiries: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Member portal" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
      {ITEMS.map((it) => {
        const active = it.match(pathname);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "border-b-2 py-1 font-medium transition-colors",
              active ? "border-white text-white" : "border-transparent text-white/75 hover:text-white",
            )}
          >
            {it.label}
            {it.label === "Enquiries" && newEnquiries > 0 && (
              <span className="ml-1.5 rounded-full bg-damson px-1.5 py-0.5 text-[10px] font-bold text-white">{newEnquiries}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
