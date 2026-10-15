"use client";

import Link from "next/link";
import { Asterisk, HelpCircle, Home, UserRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/cms/auth-actions";

// Kentico 11's dark administration header: the asterisk opens the
// application list, the house goes back to the dashboard, then the
// breadcrumb; help and the user menu sit on the right.
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
    <header className="flex h-[39px] shrink-0 items-center gap-3 bg-[#242424] px-3 text-[13px] text-white">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-7 w-7 items-center justify-center rounded text-[#cfcfcf] hover:bg-white/10 hover:text-white" title="Applications">
          <Asterisk className="h-5 w-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Content management</div>
          <DropdownMenuItem render={<Link href="/cms">Pages</Link>} />
          {canManageMedia && <DropdownMenuItem render={<Link href="/cms/media">Media libraries</Link>} />}
          {canReviewWorkflow && (
            <>
              <DropdownMenuItem render={<Link href="/cms/approvals">Pending pages</Link>} />
              <DropdownMenuItem render={<Link href="/cms/enquiries">Forms (enquiries &amp; signups)</Link>} />
              <DropdownMenuItem render={<Link href="/cms/users">Users</Link>} />
            </>
          )}
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">Development</div>
          <DropdownMenuItem render={<Link href="/cms/widgets">Widgets</Link>} />
          <DropdownMenuItem render={<Link href="/cms/widgets/guide">Editor guide</Link>} />
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/portal">Member portal</Link>} />
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href="/cms" className="flex h-7 w-7 items-center justify-center rounded text-[#cfcfcf] hover:bg-white/10 hover:text-white" title="Back to dashboard">
        <Home className="h-[18px] w-[18px]" />
      </Link>

      <nav className="flex items-center gap-1.5 text-[#cfcfcf]">
        {breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-white/30">/</span>}
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

      <Link href="/cms/widgets/guide" className="flex h-7 w-7 items-center justify-center rounded text-[#cfcfcf] hover:bg-white/10 hover:text-white" title="Editor guide">
        <HelpCircle className="h-5 w-5" />
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-7 items-center gap-2 rounded px-1.5 text-[#cfcfcf] hover:bg-white/10 hover:text-white">
          <UserRound className="h-5 w-5" />
          <span className="hidden sm:inline">{user.name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <div className="px-1.5 py-1 text-sm">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs font-normal text-neutral-500">{user.roleName}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/cms/account">Change my password</Link>} />
          <DropdownMenuItem onClick={() => signOutAction()}>Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
