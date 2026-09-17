import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPageBySlug, getPageById, getNearbyPages, getChildPages } from "@/lib/data/pages";
import { getAllListingsGrouped } from "@/lib/data/listings";
import { PagePreview } from "@/components/cms/page-editor/page-preview";

type Params = { slug: string[] };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug.join("/"));
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

export default async function PublicPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const { q } = await searchParams;
  const page = await getPageBySlug(slug.join("/"));
  if (!page || page.status !== "PUBLISHED") notFound();

  // Kentico "linked document" pattern — this tree location just points at
  // another page's real content. Send visitors to the canonical URL.
  if (page.linkedPageId) {
    const canonical = await getPageById(page.linkedPageId);
    if (canonical) redirect(`/${canonical.slug}`);
    notFound();
  }

  const [listings, nearby, childPages] = await Promise.all([
    getAllListingsGrouped(),
    getNearbyPages(page.id, page.parentId),
    page.contentBlocks.length === 0 ? getChildPages(page.id) : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PagePreview page={page} listings={listings} nearby={nearby} childPages={childPages} linkBase="" initialSearchText={q ?? ""} />
    </div>
  );
}
