"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { buildShareUrl, mergeSharedTripLink } from "@/lib/trip-share";

export function MyTripView() {
  const { items, remove } = useTrip();
  const searchParams = useSearchParams();
  const addParam = searchParams.get("add");
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!addParam || mergedFor.current === addParam) return;
    mergedFor.current = addParam;
    const ids = addParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    // mergeSharedTripLink writes directly to the shared trip store, which
    // the useTrip() subscription above picks up automatically — no local
    // state to set here.
    mergeSharedTripLink(ids).then(() => toast("Trip synced from shared link"));
  }, [addParam]);

  const copyShareLink = async () => {
    const url = buildShareUrl(items, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      toast("Link copied — share it to sync this trip on another device.");
    } catch {
      toast("Couldn't copy the link — your browser may be blocking clipboard access.");
    }
  };

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-300 p-10 text-center">
        <p className="text-stone-500">Nothing saved yet.</p>
        <p className="mt-1 text-sm text-stone-400">
          Browse{" "}
          <Link href="/things-to-do" className="font-medium text-somerset-green hover:underline">
            things to do
          </Link>{" "}
          and tap &ldquo;Add to trip&rdquo; on anywhere you&apos;d like to visit.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {items.length} place{items.length === 1 ? "" : "s"} saved on this device.
        </p>
        <button
          type="button"
          onClick={copyShareLink}
          className="rounded-full bg-damson px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
        >
          Copy shareable link
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.id} className="group space-y-2">
            <div className="relative overflow-hidden rounded-xl">
              <Link href={`/${item.slug}`}>
                {item.heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external/dynamic upload paths, not build-time known
                  <img
                    src={item.heroImageUrl}
                    alt=""
                    className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="aspect-square w-full bg-stone-100" />
                )}
              </Link>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-stone-600 shadow-sm hover:bg-white hover:text-damson"
              >
                Remove
              </button>
            </div>
            <Link href={`/${item.slug}`} className="block truncate text-xs font-medium text-stone-600 hover:text-somerset-green">
              {item.title}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
