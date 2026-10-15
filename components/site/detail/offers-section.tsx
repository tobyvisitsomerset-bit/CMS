export type LiveOffer = { id: string; title: string; description: string | null; url: string | null; validTo: Date | null };

// Special offers a member has had approved for a listing. Shown on the
// listing template and under the widgets of a page that is built from them.
export function OffersSection({ offers, embedded = false }: { offers: LiveOffer[]; embedded?: boolean }) {
  if (offers.length === 0) return null;
  const list = (
    <section className="space-y-3">
      <h2 className="font-serif text-2xl font-black text-stone-900">Special offers</h2>
      <div className="space-y-3">
        {offers.map((o) => (
          <div key={o.id} className="rounded-3xl border border-damson/30 bg-damson/5 p-5">
            <p className="font-serif text-xl font-black text-stone-900">{o.title}</p>
            {o.description && <p className="mt-1 text-sm text-stone-700">{o.description}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              {o.validTo && (
                <span className="text-stone-500">
                  Until {o.validTo.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}
                </span>
              )}
              {o.url && (
                <a href={o.url} target="_blank" rel="noreferrer" className="font-bold text-damson hover:underline">
                  Find out more
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
  return embedded ? <div className="mx-auto max-w-5xl px-6 py-8">{list}</div> : list;
}
