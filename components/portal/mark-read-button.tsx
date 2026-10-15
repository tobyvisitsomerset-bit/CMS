"use client";

import { useTransition } from "react";
import { markNotificationsReadAction } from "@/app/portal/actions";

export function MarkReadButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => markNotificationsReadAction())}
      className="text-xs font-medium text-somerset-green hover:underline disabled:opacity-50"
    >
      Mark all as read
    </button>
  );
}
