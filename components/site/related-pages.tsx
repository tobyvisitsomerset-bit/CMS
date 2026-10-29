import Link from "next/link";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { RelatedTile } from "@/lib/data/related";

export function RelatedPages({ tiles }: { tiles: RelatedTile[] }) {
  if (tiles.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pb-12">
      <h2 className="mb-4 font-serif text-2xl font-black text-stone-900">You might also like</h2>
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.id} href={`/${t.slug}`} className="group space-y-2">
            <div className="overflow-hidden rounded-2xl">
              <Img src={t.heroImageUrl} alt="" label={t.title} className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-105" />
            </div>
            <p className="text-sm font-semibold text-stone-800 group-hover:text-somerset-green">{t.title}</p>
            {t.subtitle && <p className="line-clamp-2 text-xs text-stone-500">{t.subtitle}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}
