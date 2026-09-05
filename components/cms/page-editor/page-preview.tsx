import { BlockRenderer, type ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
import { BusinessInfoPanel } from "@/components/cms/page-editor/business-info-panel";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

export function PagePreview({ page, listings }: { page: PageDetail; listings: ListingsByCategory }) {
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

  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border bg-white shadow-sm">
      <div
        className="flex h-64 items-end bg-gradient-to-br from-emerald-800 to-emerald-950 bg-cover bg-center p-8 text-white"
        style={page.heroImageUrl ? { backgroundImage: `url(${page.heroImageUrl})` } : undefined}
      >
        <div>
          {page.membershipTier && (
            <span className="mb-2 inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
              {page.membershipTier.charAt(0) + page.membershipTier.slice(1).toLowerCase()} Member
            </span>
          )}
          <h1 className="font-serif text-4xl font-bold">{page.title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-emerald-50">{subtitle}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          {bodyContent ? (
            <p className="whitespace-pre-wrap text-neutral-700">{bodyContent}</p>
          ) : (
            <p className="italic text-neutral-400">No body content yet. Add sections in the Design tab, or write body copy in Content.</p>
          )}

          {gallery.length > 0 && (
            <div className="grid grid-cols-3 gap-2 pt-2">
              {gallery.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element -- external/dynamic upload paths, not build-time known
                <img key={url} src={url} alt="" className="aspect-square w-full rounded-md object-cover" />
              ))}
            </div>
          )}

          {page.callToActionLabel && (
            <a
              href={page.callToActionUrl || "#"}
              className="inline-block rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
            >
              {page.callToActionLabel}
            </a>
          )}

          {(page.tags.length > 0 || page.categories.length > 0) && (
            <div className="flex flex-wrap gap-1.5 border-t pt-4">
              {page.categories.map((c) => (
                <span key={c.id} className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">
                  {c.name}
                </span>
              ))}
              {page.tags.map((t) => (
                <span key={t.id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  #{t.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {info && (
          <div className="md:col-span-1">
            <BusinessInfoPanel info={info} />
          </div>
        )}
      </div>
    </div>
  );
}
