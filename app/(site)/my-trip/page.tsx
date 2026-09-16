import { Suspense } from "react";
import { MyTripView } from "@/components/trip/my-trip-view";

export const metadata = {
  title: "My Trip | Visit Somerset",
  description: "The places you're planning to visit in Somerset, saved on this device.",
};

export default function MyTripPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl font-black text-stone-900">My Trip</h1>
      <p className="mt-1 text-stone-500">Your saved places, kept on this device.</p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <MyTripView />
        </Suspense>
      </div>
    </div>
  );
}
