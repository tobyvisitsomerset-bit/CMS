import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ExploreAreaTile } from "@/lib/data/pages";

export function ExploreAreaTiles({ tiles }: { tiles: ExploreAreaTile[] }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-black text-stone-900">Explore Somerset</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 transition-shadow hover:shadow-md hover:shadow-stone-200/60"
          >
            <p className="font-serif text-lg font-black text-stone-900">{tile.label}</p>
            <div className="mt-3 flex items-center justify-between text-sm text-stone-500">
              <span>{tile.description}</span>
              <ArrowRight className="size-4 shrink-0 text-somerset-green transition-transform group-hover:translate-x-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
