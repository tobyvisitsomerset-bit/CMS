"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelAdBookingAction } from "@/app/portal/actions";

export function CancelBookingButton({ refCode }: { refCode: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await cancelAdBookingAction(refCode);
          toast.success("Request cancelled.");
          router.refresh();
        })
      }
      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
    >
      Cancel request
    </button>
  );
}
