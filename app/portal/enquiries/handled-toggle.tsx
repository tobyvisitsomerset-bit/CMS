"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setEnquiryHandledAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";

export function HandledToggle({ id, handled }: { id: string; handled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={handled ? "outline" : "default"}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setEnquiryHandledAction(id, !handled);
          router.refresh();
        })
      }
    >
      {handled ? "Mark as new" : "Mark as dealt with"}
    </Button>
  );
}
