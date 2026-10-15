import { ExternalLink } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { ShopProducer } from "@/lib/data/shop";

// One producer's real products with Buy links that go to the producer's own
// shop (that is where payment happens). With no readable product feed it
// shows the producer and a single link, never invented products.
export function BuyPanel({ heading, limit, producer }: { heading?: string; limit: number; producer: ShopProducer | null }) {
  if (!producer) {
    return (
      <section className="px-6 py-8">
        <p className="mx-auto max-w-5xl rounded-3xl bg-cool-grey p-6 text-center text-sm text-stone-500">
          Choose a producer for this Buy panel in its properties.
        </p>
      </section>
    );
  }
  const products = producer.products.slice(0, Math.min(Math.max(limit, 1), 12));
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            {heading && <p className="text-xs font-semibold tracking-wider text-somerset-green uppercase">{heading}</p>}
            <h2 className="mt-1 font-serif text-2xl font-black text-stone-900">{producer.title}</h2>
            {producer.town && <p className="text-sm text-stone-500">{producer.town}</p>}
            {producer.description && <p className="mt-2 line-clamp-3 text-sm text-stone-600">{producer.description}</p>}
          </div>
          {producer.website && (
            <a
              href={producer.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-5 py-2.5 text-sm font-bold text-stone-800 hover:border-somerset-green"
            >
              Visit their shop <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-4">
            {products.map((prod) => (
              <div key={prod.url}>
                <Img src={prod.imageUrl} alt={prod.title} label={prod.title} className="aspect-square w-full rounded-3xl" />
                <p className="mt-2 line-clamp-2 text-sm text-stone-700">{prod.title}</p>
                <p className="mt-1 font-serif text-lg font-black text-stone-900">{prod.price}</p>
                <a
                  href={prod.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-damson px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  Buy <ExternalLink className="size-3" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-2xl bg-cool-grey p-4 text-sm text-stone-600">
            Products from {producer.title} are not feeding through yet. Visit their shop to see the full range.
          </p>
        )}
      </div>
    </section>
  );
}
