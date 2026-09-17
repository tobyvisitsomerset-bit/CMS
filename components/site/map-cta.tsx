import Link from "next/link";
import { MapPin } from "lucide-react";

export function MapCta() {
  return (
    <section className="overflow-hidden rounded-2xl bg-deep-green px-8 py-12 text-center text-white">
      <MapPin className="mx-auto size-8" />
      <h2 className="mt-3 font-serif text-2xl font-black">See it all on the map</h2>
      <p className="mx-auto mt-2 max-w-md text-white/80">
        Every place we know about, on one live map. Filter by category and find what&rsquo;s nearby.
      </p>
      <Link
        href="/interactive-map"
        className="mt-5 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-deep-green transition-colors hover:bg-white/90"
      >
        Open the map
      </Link>
    </section>
  );
}
