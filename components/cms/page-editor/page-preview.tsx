import { BlockRenderer, type ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
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

  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-lg border bg-white shadow-sm p-8">
      <div
        className="-m-8 mb-4 flex h-64 items-end bg-gradient-to-br from-emerald-800 to-emerald-950 bg-cover bg-center p-8 text-white"
        style={page.heroImageUrl ? { backgroundImage: `url(${page.heroImageUrl})` } : undefined}
      >
        <div>
          <h1 className="font-serif text-4xl font-bold">{page.title}</h1>
          {page.subtitle && <p className="mt-2 max-w-xl text-emerald-50">{page.subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">
        {page.bodyContent ? (
          <p className="whitespace-pre-wrap text-neutral-700">{page.bodyContent}</p>
        ) : (
          <p className="italic text-neutral-400">No body content yet. Add sections in the Design tab, or write body copy in Content.</p>
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
    </div>
  );
}
