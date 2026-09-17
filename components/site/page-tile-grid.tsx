import Link from "next/link";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { FeaturedPageTile } from "@/lib/data/pages";

// Simple real-page tile grid — title/photo-or-placeholder/subtitle only, no
// rating/price/tier badge, since real pages don't carry that data. Used by
// the homepage teasers (Phase 9) in place of the mock Listing model.
export function PageTileGrid({ tiles }: { tiles: FeaturedPageTile[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.id} href={`/${t.slug}`} className="group space-y-2">
          <div className="overflow-hidden rounded-xl">
            <Img src={t.heroImageUrl} alt="" className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-105" />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-800 group-hover:text-somerset-green">{t.title}</p>
            {t.subtitle && <p className="line-clamp-2 text-xs text-stone-500">{t.subtitle}</p>}
          </div>
        </Link>
      ))}
    </div>
  );
}
