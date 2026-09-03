"use client";

import Link from "next/link";
import { HelpCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/app/cms/auth-actions";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TopBar({
  user,
  breadcrumb,
  canManageMedia,
  canReviewWorkflow,
}: {
  user: { name: string; roleName: string };
  breadcrumb: { label: string; href?: string }[];
  canManageMedia: boolean;
  canReviewWorkflow: boolean;
}) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-3 text-sm text-neutral-200">
      <div className="flex h-7 w-7 items-center justify-center rounded bg-emerald-700 font-serif text-xs font-semibold text-white">
        VS
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 font-semibold text-white hover:text-neutral-300">
          Visit Somerset
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem render={<Link href="/cms">Content tree</Link>} />
          <DropdownMenuItem render={<Link href="/portal">Member portal</Link>} />
        </DropdownMenuContent>
      </DropdownMenu>

      <nav className="flex items-center gap-1 text-neutral-400">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-neutral-600">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-white">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-white">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1" />

      {canManageMedia && (
        <Link href="/cms/media" className="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white">
          Media
        </Link>
      )}
      {canReviewWorkflow && (
        <Link href="/cms/approvals" className="rounded px-2 py-1 text-neutral-300 hover:bg-neutral-800 hover:text-white">
          Approvals
        </Link>
      )}

      <button className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white" title="Help">
        <HelpCircle className="h-4 w-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded p-1 hover:bg-neutral-800">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-emerald-800 text-[10px] text-white">{initials(user.name)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-1.5 py-1 text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs font-normal text-neutral-500">{user.roleName}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOutAction()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
