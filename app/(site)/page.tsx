import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getNearbyPages, getChildPages } from "@/lib/data/pages";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { resolveBlockData } from "@/lib/data/block-data";
import { PagePreview } from "@/components/cms/page-editor/page-preview";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug("home");
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || page.subtitle || undefined,
    openGraph: {
      title: page.ogTitle || page.seoTitle || page.title,
      description: page.ogDescription || page.seoDescription || undefined,
      images: page.socialShareImage ? [page.socialShareImage] : undefined,
    },
  };
}

// The homepage is a real Page, edited via the CMS's own Design tab like
// every other page (Phase 10) — this route is a thin wrapper mirroring
// [...slug]/page.tsx, just hardcoded to slug "home" since Next's catch-all
// route can't match "/" itself.
export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page || page.status !== "PUBLISHED") notFound();

  const [listings, nearby, childPages, blockData] = await Promise.all([
    getAllListingsGrouped(),
    getNearbyPages(page.id, page.parentId),
    page.contentBlocks.length === 0 ? getChildPages(page.id) : Promise.resolve([]),
    resolveBlockData(page.contentBlocks),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PagePreview page={page} listings={listings} nearby={nearby} childPages={childPages} blockData={blockData} linkBase="" />
    </div>
  );
}
