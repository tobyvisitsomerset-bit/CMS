"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { cn } from "@/lib/utils";

export function AddToTripButton({
  id,
  title,
  slug,
  heroImageUrl,
}: {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
}) {
  const { has, add, remove } = useTrip();
  const router = useRouter();
  const added = has(id);

  const toggle = () => {
    if (added) {
      remove(id);
      toast("Removed from trip");
      return;
    }
    add({ id, title, slug, heroImageUrl });
    toast("Added to your trip", {
      description: "View it anytime on My Trip.",
      action: { label: "View", onClick: () => router.push("/my-trip") },
    });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
        added ? "border-damson bg-damson/10 text-damson" : "border-stone-300 text-stone-600 hover:border-damson hover:text-damson",
      )}
    >
      <Heart className={cn("size-4", added && "fill-damson")} />
      {added ? "Added to trip" : "Add to trip"}
    </button>
  );
}
