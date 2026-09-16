import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug, getNearbyPages } from "@/lib/data/pages";
import { getAllListingsGrouped } from "@/lib/data/listings";
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

export default async function HomePage() {
  const page = await getPageBySlug("home");
  if (!page || page.status !== "PUBLISHED") notFound();

  const [listings, nearby] = await Promise.all([
    getAllListingsGrouped(),
    getNearbyPages(page.id, page.parentId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <PagePreview page={page} listings={listings} nearby={nearby} linkBase="" />
    </div>
  );
}
