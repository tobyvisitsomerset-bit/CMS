"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markSectionListingsAction } from "@/app/cms/actions";

// Pages made in the CMS under this section that have business details but
// were never marked as listings, so the lists and map skip them.
export function FixSectionBanner({ pageId, count }: { pageId: string; count: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <span>
        <strong>{count}</strong> page{count === 1 ? "" : "s"} in this section {count === 1 ? "is" : "are"} published with business details but
        not marked as a listing, so lists, the map and search skip {count === 1 ? "it" : "them"}.
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            try {
              const r = await markSectionListingsAction(pageId);
              toast.success(`${r.marked} page${r.marked === 1 ? "" : "s"} fixed`);
              router.refresh();
            } catch {
              toast.error("Could not fix them.");
            }
          })
        }
        className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {pending ? "Fixing..." : "Fix them all"}
      </button>
    </div>
  );
}
