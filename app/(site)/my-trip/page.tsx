import { Suspense } from "react";
import { MyTripView } from "@/components/trip/my-trip-view";

export const metadata = {
  title: "My Trip | Visit Somerset",
  description: "The places you're planning to visit in Somerset, day by day, saved on this device.",
};

export default function MyTripPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-somerset-green uppercase">My trip</p>
      <div className="mt-2">
        <Suspense fallback={null}>
          <MyTripView />
        </Suspense>
      </div>
    </div>
  );
}
