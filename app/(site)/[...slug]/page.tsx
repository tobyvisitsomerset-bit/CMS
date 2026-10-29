import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPageBySlug, getPageById, getChildPages } from "@/lib/data/pages";
import { EMPTY_EXTRAS, getDetailExtras, getLiveOffers } from "@/lib/data/detail-extras";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { resolveBlockData } from "@/lib/data/block-data";
import { PagePreview, isFormDriven } from "@/components/cms/page-editor/page-preview";
import { recordView } from "@/lib/data/views";
import { headers } from "next/headers";
import { decodeKenticoText } from "@/lib/kentico-item-fields";
import { getRelatedTiles } from "@/lib/data/related";
import { RelatedPages } from "@/components/site/related-pages";

type Params = { slug: string[] };

// Kentico stored site configuration (advert slots, menu entries) as pages.
// They are not content, so a visitor who lands on one gets a 404 rather than
// an empty page.
function kenticoClass(customFields: string | null): string | null {
  return (customFields ?? "").match(/"key":"_kenticoClassName","value":"([^"]+)"/)?.[1] ?? null;
}

function snippet(text: string | null | undefined): string | undefined {
  const t = (decodeKenticoText(text) ?? "").replace(/\s+/g, " ").trim();
  if (!t) return undefined;
  return t.length <= 155 ? t : `${t.slice(0, 152).replace(/\s+\S*$/, "")}...`;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || snippet(page.subtitle) || snippet(page.bodyContent),
    openGraph: {
      title: page.ogTitle || page.seoTitle || page.title,
      description: page.ogDescription || page.seoDescription || undefined,
      images: page.socialShareImage ? [page.socialShareImage] : undefined,
    },
  };
}

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const flatSp: Record<string, string | undefined> = Object.fromEntries(
    Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const page = await getPageBySlug(slug.join("/"));
  if (!page || page.status !== "PUBLISHED") notFound();
  if (kenticoClass(page.customFields) === "sz.ad") notFound();

  // Kentico "linked document" pattern — this tree location just points at
  // another page's real content. Send visitors to the canonical URL.
  if (page.linkedPageId) {
    const canonical = await getPageById(page.linkedPageId);
    if (canonical) redirect(`/${canonical.slug}`);
    notFound();
  }

  if (page.assignedMemberId) {
    const ua = (await headers()).get("user-agent");
    await recordView(page.id, ua);
  }

  const [listings, extras, childPages, blockData, related] = await Promise.all([
    getAllListingsGrouped(),
    isFormDriven(page)
      ? getDetailExtras(page)
      : getLiveOffers(page.id).then((offers) => ({ ...EMPTY_EXTRAS, offers })),
    isFormDriven(page) ? getChildPages(page.id) : Promise.resolve([]),
    isFormDriven(page) ? Promise.resolve({}) : resolveBlockData(page.contentBlocks, sp),
    getRelatedTiles(page.id),
  ]);

  if (
    kenticoClass(page.customFields) === "cms.menuitem" &&
    !page.bodyContent &&
    page.contentBlocks.length === 0 &&
    childPages.length === 0
  ) {
    notFound();
  }

  return (
    <div>
      <PagePreview page={page} listings={listings} extras={extras} childPages={childPages} blockData={blockData} linkBase="" initialSearchText={q ?? ""} searchParams={flatSp} />
      <RelatedPages tiles={related} />
    </div>
  );
}
