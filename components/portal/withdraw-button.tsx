"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { withdrawChangeAction } from "@/app/portal/actions";

export function WithdrawButton({ pageId }: { pageId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await withdrawChangeAction(pageId);
          if (res.ok) {
            toast.success(res.message);
            router.refresh();
          }
        })
      }
      className="rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-50 disabled:opacity-50"
    >
      Withdraw
    </button>
  );
}
