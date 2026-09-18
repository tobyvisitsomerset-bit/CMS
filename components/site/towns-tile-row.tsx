import Link from "next/link";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { TownTile } from "@/lib/data/pages";

export function TownsTileRow({ towns, title = "Towns & cities" }: { towns: TownTile[]; title?: string }) {
  return (
    <section>
      <h2 className="font-serif text-2xl font-black text-stone-900">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {towns.map((town) => (
          <Link key={town.id} href={`/${town.slug}`} className="group space-y-2">
            <div className="overflow-hidden rounded-xl">
              <Img src={town.heroImageUrl} alt="" className="aspect-square w-full transition-transform duration-300 group-hover:scale-105" />
            </div>
            <p className="text-sm font-medium text-stone-700 group-hover:text-somerset-green">{town.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
