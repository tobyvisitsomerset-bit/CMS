import type { ListingCategory } from "@prisma/client";
import { BlockRenderer, type ListingsByCategory, type RealBlockData } from "@/components/cms/page-builder/block-renderer";
import { ListingDirectoryProvider } from "@/components/cms/page-builder/listing-directory-context";
import { ListingDetailPreview } from "@/components/cms/page-editor/listing-detail-preview";
import { Img } from "@/components/cms/page-builder/listing-ui";
import Link from "next/link";
import { PlainPage } from "@/components/site/plain-page";
import { RoomsSection } from "@/components/site/detail/rooms-section";
import { OffersSection } from "@/components/site/detail/offers-section";
import { decodeKenticoText, emptyBusinessInfo, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import type { getPageById, ChildPageTile } from "@/lib/data/pages";
import { EMPTY_EXTRAS, type DetailExtras } from "@/lib/data/detail-extras";

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

// The "Business Detail" starter template put placeholder hero/text/gallery
// widgets on a page, which hid everything typed into the Form tab. A listing
// page that only has those starter widgets is rendered from its form instead.
const STARTER_TYPES = new Set(["hero", "text", "gallery"]);
const LISTING_ROOTS = ["places-to-stay/", "things-to-do/", "festivals-events/"];

export function isFormDriven(page: { slug: string; membershipTier: unknown; assignedMemberId: string | null; rooms: unknown[]; customFields: string | null; contentBlocks: { type: string }[] }) {
  if (page.contentBlocks.length === 0) return true;
  if (!page.contentBlocks.every((b) => STARTER_TYPES.has(b.type))) return false;
  const info = getBusinessInfo(parseCustomFields(page.customFields));
  return (
    !!info ||
    !!page.membershipTier ||
    !!page.assignedMemberId ||
    page.rooms.length > 0 ||
    LISTING_ROOTS.some((r) => page.slug.startsWith(r))
  );
}

export function PagePreview({
  page,
  listings,
  extras = EMPTY_EXTRAS,
  childPages = [],
  blockData = {},
  linkBase = "/cms",
  initialSearchText = "",
  searchParams = {},
  wrapBlock,
}: {
  page: PageDetail;
  listings: ListingsByCategory;
  extras?: DetailExtras;
  childPages?: ChildPageTile[];
  blockData?: Record<string, RealBlockData>;
  linkBase?: string;
  initialSearchText?: string;
  searchParams?: Record<string, string | undefined>;
  /** Editor "Page" tab: wrap each widget so it can be clicked to edit. */
  wrapBlock?: (blockId: string, type: string, node: React.ReactNode) => React.ReactNode;
}) {
  if (!isFormDriven(page)) {
    const blockList = page.contentBlocks.map((block) => {
      const node = (
        <BlockRenderer
          key={block.id}
          type={block.type}
          config={JSON.parse(block.config || "{}")}
          listings={listings}
          realData={blockData[block.id]}
          pageSlug={page.slug}
          pageTitle={page.title}
          pageId={page.id}
        />
      );
      return wrapBlock ? <div key={block.id}>{wrapBlock(block.id, block.type, node)}</div> : node;
    });
    const hasSearchBlock = page.contentBlocks.some((block) => block.type === "listing_search");
    const category = hasSearchBlock ? resolveDirectoryCategory(page.contentBlocks) : null;

    // Public pages render full-bleed - each block supplies its own inner
    // max-width. The CMS preview keeps the contained card.
    const isPublic = linkBase !== "/cms";
    return (
      <div className={isPublic ? "bg-white" : "mx-auto max-w-5xl overflow-hidden bg-white shadow-sm"}>
        {category ? (
          <ListingDirectoryProvider items={listings[category]} category={category} initialSearchText={initialSearchText}>
            {blockList}
          </ListingDirectoryProvider>
        ) : (
          blockList
        )}
        <RoomsSection rooms={page.rooms} hasEnquiryForm={false} embedded />
        <OffersSection offers={extras.offers} embedded />
      </div>
    );
  }

  const fields = parseCustomFields(page.customFields);
  // Member businesses always use the listing template; it reads the Form tab
  // boxes directly, so there is nothing to rebuild per page.
  const isMemberPage =
    !!page.membershipTier ||
    !!page.assignedMemberId ||
    page.rooms.length > 0 ||
    (page.contentBlocks.length > 0 && LISTING_ROOTS.some((r) => page.slug.startsWith(r)));
  const info = getBusinessInfo(fields) ?? (isMemberPage ? emptyBusinessInfo() : null);
  const gallery: string[] = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
  const subtitle = decodeKenticoText(page.subtitle);
  // Starter "About" text typed into a widget is kept when the form has no description.
  const starterText = page.contentBlocks
    .filter((b) => b.type === "text")
    .map((b) => {
      try {
        return String(JSON.parse(b.config || "{}").body ?? "");
      } catch {
        return "";
      }
    })
    .find(Boolean);
  const bodyContent = decodeKenticoText(page.bodyContent) ?? decodeKenticoText(starterText);

  // A real business/attraction/event page — full listing-detail layout
  // (gallery strip, rooms, reviews, nearby, contact sidebar).
  if (info) {
    return (
      <ListingDetailPreview
        page={page}
        info={info}
        gallery={gallery}
        bodyContent={bodyContent}
        extras={extras}
        linkBase={linkBase}
        searchParams={searchParams}
      />
    );
  }

  // Public site: banner + prose + child-page grid (components/site/plain-page.tsx).
  if (linkBase !== "/cms") {
    return (
      <>
      <PlainPage
        title={page.title}
        subtitle={subtitle}
        body={bodyContent}
        heroImageUrl={page.heroImageUrl}
        gallery={gallery}
        childPages={childPages}
        cta={page.callToActionLabel ? { label: page.callToActionLabel, url: page.callToActionUrl || "#" } : null}
      />
      <RoomsSection rooms={page.rooms} hasEnquiryForm={false} embedded />
        <OffersSection offers={extras.offers} embedded />
      </>
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
