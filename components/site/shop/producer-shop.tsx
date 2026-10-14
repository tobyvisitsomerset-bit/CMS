import { ExternalLink } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { ShopProducer } from "@/lib/data/shop";
import { ScrollRow } from "./scroll-row";

function anchor(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// One block per producer: name, town, a line about them, a scrolling row of
// their real products with prices and a Buy Now link out to their own shop.
// Producers with no readable feed get the same block without the product row.
export function ProducerShop({ intro, producers }: { intro?: string; producers: ShopProducer[] }) {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {intro && (
          <div className="max-w-3xl space-y-3 text-stone-700">
            {intro.split(/\n{2,}/).map((p, i) => (
              <p key={i} className={i === 0 ? "text-lg leading-relaxed" : "leading-relaxed"}>
                {p}
              </p>
            ))}
          </div>
        )}

        {producers.length > 0 && (
          <nav aria-label="Producers" className="sticky top-[7.5rem] z-10 -mx-6 mt-8 overflow-x-auto bg-white/95 px-6 py-3 backdrop-blur">
            <ul className="flex gap-2">
              {producers.map((p) => (
                <li key={p.id}>
                  <a href={`#${anchor(p.title)}`} className="block whitespace-nowrap rounded-full border border-stone-200 px-4 py-1.5 text-sm font-semibold text-stone-700 hover:border-somerset-green hover:text-somerset-green">
                    {p.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <div className="mt-6 space-y-12">
          {producers.map((p) => (
            <article key={p.id} id={anchor(p.title)} className="scroll-mt-48 border-t border-stone-200 pt-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  {p.town && <p className="text-xs font-semibold tracking-wider text-stone-400 uppercase">{p.town}</p>}
                  <h2 className="font-serif text-3xl font-black text-stone-900">{p.title}</h2>
                  {p.description && <p className="mt-2 line-clamp-3 text-stone-600">{p.description}</p>}
                </div>
                {p.website && (
                  <a
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-somerset-green"
                  >
                    Shop full range <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>

              {p.products.length > 0 ? (
                <div className="mt-5">
                  <ScrollRow>
                    {p.products.map((prod) => (
                      <div key={prod.url} className="w-44 shrink-0 snap-start">
                        <Img src={prod.imageUrl} alt={prod.title} label={prod.title} className="aspect-square w-full rounded-3xl" />
                        <p className="mt-2 line-clamp-2 text-sm text-stone-700">{prod.title}</p>
                        <p className="mt-1 font-serif text-lg font-black text-stone-900">{prod.price}</p>
                        <a
                          href={prod.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-damson px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                        >
                          Buy Now <ExternalLink className="size-3" />
                        </a>
                      </div>
                    ))}
                  </ScrollRow>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-4 rounded-3xl bg-cool-grey p-5">
                  <Img src={p.heroImageUrl} alt="" label={p.title} className="size-20 shrink-0 rounded-2xl" />
                  <p className="min-w-0 flex-1 text-sm text-stone-600">
                    Products from {p.title} aren&apos;t feeding through yet — visit their shop to see the full range.
                  </p>
                  {p.website && (
                    <a href={p.website} target="_blank" rel="noreferrer" className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
                      {p.buyLabel}
                    </a>
                  )}
                </div>
              )}
            </article>
          ))}
          {producers.length === 0 && <p className="rounded-3xl bg-cool-grey p-8 text-center text-stone-500">Producers will appear here soon.</p>}
        </div>
      </div>
    </section>
  );
}
