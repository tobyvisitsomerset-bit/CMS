"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  unreadNotificationCountAction,
} from "@/app/cms/actions";

type Notification = Awaited<ReturnType<typeof listNotificationsAction>>[number];

function timeAgo(date: Date | string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsBell() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    unreadNotificationCountAction().then(setUnreadCount).catch(() => {});
    const interval = setInterval(() => {
      unreadNotificationCountAction().then(setUnreadCount).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      listNotificationsAction().then(setNotifications).catch(() => {});
    }
  }

  function handleClick(n: Notification) {
    startTransition(async () => {
      if (!n.read) {
        await markNotificationReadAction(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setOpen(false);
      if (n.pageId) router.push(`/cms/${n.pageId}`);
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button size="icon" variant="ghost" title="Notifications" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-1.5 py-1">
          <span className="text-xs font-medium text-neutral-500">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="text-xs text-somerset-green hover:underline">
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 && <p className="p-3 text-center text-sm text-neutral-400">No notifications yet.</p>}
        {notifications.map((n) => (
          <DropdownMenuItem key={n.id} onClick={() => handleClick(n)} className="flex-col items-start gap-0.5 whitespace-normal">
            <span className={n.read ? "text-neutral-600" : "font-medium text-neutral-900"}>{n.message}</span>
            <span className="text-xs text-neutral-400">{timeAgo(n.createdAt)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
