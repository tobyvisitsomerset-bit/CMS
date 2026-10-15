"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleRegistrationAction } from "@/app/portal/vs-events/actions";

export function VsEventRegister({ eventId, registered: initial, full }: { eventId: string; registered: boolean; full: boolean }) {
  const [registered, setRegistered] = useState(initial);
  const [pending, start] = useTransition();
  const disabled = pending || (full && !registered);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() =>
        start(async () => {
          const res = await toggleRegistrationAction(eventId);
          if (res.ok) {
            setRegistered(res.registered);
            toast.success(res.registered ? "You are on the list" : "Removed from the list");
          } else toast.error(res.error);
        })
      }
      className={`rounded-full px-5 py-2 text-sm font-bold disabled:opacity-60 ${
        registered ? "border border-somerset-green text-somerset-green hover:bg-somerset-green/10" : "bg-somerset-green text-white hover:opacity-90"
      }`}
    >
      {registered ? "I am coming (cancel)" : full ? "Event full" : "I am coming"}
    </button>
  );
}
