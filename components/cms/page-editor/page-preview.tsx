import type { ListingCategory } from "@prisma/client";
import { BlockRenderer, type ListingsByCategory, type RealBlockData } from "@/components/cms/page-builder/block-renderer";
import { ListingDirectoryProvider } from "@/components/cms/page-builder/listing-directory-context";
import { ListingDetailPreview } from "@/components/cms/page-editor/listing-detail-preview";
import { Img } from "@/components/cms/page-builder/listing-ui";
import Link from "next/link";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import type { getPageById, getNearbyPages, ChildPageTile } from "@/lib/data/pages";

// Resolve the one category a hub page's `listing_search` block should share
// state for, from whichever results block (`listing_grid`/`event_calendar`)
// is present on the same page — mirrors block-renderer.tsx's own category
// fallback so search/filter/sort state lines up with what's actually shown.
function resolveDirectoryCategory(blocks: { type: string; config: string }[]): ListingCategory {
  for (const block of blocks) {
    if (block.type === "listing_grid") {
      const config = JSON.parse(block.config || "{}");
      return (config.category ?? "ACCOMMODATION") as ListingCategory;
    }
    if (block.type === "event_calendar") return "EVENT";
  }
  return "ACCOMMODATION";
}

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type NearbyPage = Awaited<ReturnType<typeof getNearbyPages>>[number];

export function PagePreview({
  page,
  listings,
  nearby,
  childPages = [],
  blockData = {},
  linkBase = "/cms",
  initialSearchText = "",
}: {
  page: PageDetail;
  listings: ListingsByCategory;
  nearby: NearbyPage[];
  childPages?: ChildPageTile[];
  blockData?: Record<string, RealBlockData>;
  linkBase?: string;
  initialSearchText?: string;
}) {
  if (page.contentBlocks.length > 0) {
    const blockList = page.contentBlocks.map((block) => (
      <BlockRenderer
        key={block.id}
        type={block.type}
        config={JSON.parse(block.config || "{}")}
        listings={listings}
        realData={blockData[block.id]}
      />
    ));
    const hasSearchBlock = page.contentBlocks.some((block) => block.type === "listing_search");
    const category = hasSearchBlock ? resolveDirectoryCategory(page.contentBlocks) : null;

    return (
      <div className="mx-auto max-w-5xl overflow-hidden bg-white shadow-sm">
        {category ? (
          <ListingDirectoryProvider items={listings[category]} category={category} initialSearchText={initialSearchText}>
            {blockList}
          </ListingDirectoryProvider>
        ) : (
          blockList
        )}
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
    return (
      <ListingDetailPreview
        page={page}
        info={info}
        gallery={gallery}
        bodyContent={bodyContent}
        nearby={nearby}
        linkBase={linkBase}
      />
    );
  }

  // A plain page with no recognized business data (e.g. "Contact Us", a
  // fresh new page) — simple hero + body, no widget clutter.
  return (
    <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-stone-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.12)]">
      <div
        className="-m-8 mb-6 flex h-64 items-end bg-gradient-to-br from-somerset-green to-deep-green bg-cover bg-center p-8 text-white"
        style={page.heroImageUrl ? { backgroundImage: `url(${page.heroImageUrl})` } : undefined}
      >
        <div>
          <h1 className="font-serif text-4xl font-black tracking-tight">{page.title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-white/90">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-4">
        {bodyContent ? (
          <p className="leading-relaxed whitespace-pre-wrap text-stone-600">{bodyContent}</p>
        ) : linkBase === "/cms" && childPages.length === 0 ? (
          <p className="italic text-stone-400">No body content yet. Add sections in the Design tab, or write body copy in Content.</p>
        ) : null}

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            {gallery.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- external/dynamic upload paths, not build-time known
              <img key={url} src={url} alt="" className="aspect-square w-full rounded-xl object-cover" />
            ))}
          </div>
        )}

        {childPages.length > 0 && (
          <div className="grid grid-cols-2 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-3">
            {childPages.map((child) => (
              <Link key={child.id} href={linkBase ? `${linkBase}/${child.id}` : `/${child.slug}`} className="group space-y-2">
                <div className="overflow-hidden rounded-xl">
                  <Img src={child.heroImageUrl} alt="" className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-105" />
                </div>
                <div>
                  <p className="text-sm font-medium text-stone-800 group-hover:text-somerset-green">{child.title}</p>
                  {child.subtitle && <p className="line-clamp-2 text-xs text-stone-500">{child.subtitle}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {page.callToActionLabel && (
          <a
            href={page.callToActionUrl || "#"}
            className="inline-block rounded-full bg-damson px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-90"
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
