"use client";

import { useTrip } from "@/lib/trip-context";

export function TripNavBadge() {
  const { count } = useTrip();
  if (count === 0) return null;
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-white text-[10px] font-semibold text-damson">
      {count}
    </span>
  );
}
