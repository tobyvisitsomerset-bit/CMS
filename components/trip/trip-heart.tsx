"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useTrip } from "@/lib/trip-context";
import { cn } from "@/lib/utils";

// The round heart that sits on the corner of every listing card in the
// mockup pack — one tap saves the page to the visitor's trip (device-only).
export function TripHeart({
  id,
  title,
  slug,
  heroImageUrl,
  className,
}: {
  id: string;
  title: string;
  slug: string;
  heroImageUrl: string | null;
  className?: string;
}) {
  const { has, add, remove } = useTrip();
  const router = useRouter();
  const added = has(id);

  return (
    <button
      type="button"
      aria-label={added ? `Remove ${title} from your trip` : `Save ${title} to your trip`}
      aria-pressed={added}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (added) {
          remove(id);
          toast("Removed from your trip");
          return;
        }
        add({ id, title, slug, heroImageUrl });
        toast(`Added ${title} to your trip`, {
          action: { label: "View trip", onClick: () => router.push("/my-trip") },
        });
      }}
      className={cn(
        "flex size-9 items-center justify-center rounded-full bg-white shadow-sm transition-transform hover:scale-105",
        className,
      )}
    >
      <Heart className={cn("size-4 text-somerset-green", added && "fill-damson text-damson")} />
    </button>
  );
}
