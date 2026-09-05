import { BlockRenderer, type ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
import { ListingDetailPreview } from "@/components/cms/page-editor/listing-detail-preview";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import type { getPageById, getNearbyPages } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type NearbyPage = Awaited<ReturnType<typeof getNearbyPages>>[number];

export function PagePreview({
  page,
  listings,
  nearby,
}: {
  page: PageDetail;
  listings: ListingsByCategory;
  nearby: NearbyPage[];
}) {
  if (page.contentBlocks.length > 0) {
    return (
      <div className="mx-auto max-w-5xl overflow-hidden bg-white shadow-sm">
        {page.contentBlocks.map((block) => (
          <BlockRenderer key={block.id} type={block.type} config={JSON.parse(block.config || "{}")} listings={listings} />
        ))}
      </div>
    );
  }

  const fields = parseCustomFields(page.customFields);
  const info = getBusinessInfo(fields);
  const gallery: string[] = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
  const subtitle = decodeKenticoText(page.subtitle);
  const bodyContent = decodeKenticoText(page.bodyContent);

  // A real business/attraction/event page — full listing-detail layout
  // (gallery strip, rooms, reviews, nearby, contact sidebar).
  if (info) {
    return <ListingDetailPreview page={page} info={info} gallery={gallery} bodyContent={bodyContent} nearby={nearby} />;
  }

  // A plain page with no recognized business data (e.g. "Contact Us", a
  // fresh new page) — simple hero + body, no widget clutter.
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.12)]">
      <div
        className="-m-8 mb-6 flex h-64 items-end bg-gradient-to-br from-emerald-800 to-emerald-950 bg-cover bg-center p-8 text-white"
        style={page.heroImageUrl ? { backgroundImage: `url(${page.heroImageUrl})` } : undefined}
      >
        <div>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">{page.title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-emerald-50">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">
        {bodyContent ? (
          <p className="leading-relaxed whitespace-pre-wrap text-stone-600">{bodyContent}</p>
        ) : (
          <p className="italic text-stone-400">No body content yet. Add sections in the Design tab, or write body copy in Content.</p>
        )}

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            {gallery.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- external/dynamic upload paths, not build-time known
              <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        {page.callToActionLabel && (
          <a
            href={page.callToActionUrl || "#"}
            className="inline-block rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-900"
          >
            {page.callToActionLabel}
          </a>
        )}

        {(page.tags.length > 0 || page.categories.length > 0) && (
          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 pt-4">
            {page.categories.map((c) => (
              <span key={c.id} className="rounded-full bg-stone-900 px-2 py-0.5 text-xs text-white">
                {c.name}
              </span>
            ))}
            {page.tags.map((t) => (
              <span key={t.id} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                #{t.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
