import Link from "next/link";
import { ImageIcon, ExternalLink } from "lucide-react";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

export function MediaTab({ page }: { page: PageDetail }) {
  const gallery: string[] = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
  const images = [page.heroImageUrl, ...gallery].filter((u): u is string => !!u);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">Media used on this page</h3>
        <Link href="/cms/media" className="flex items-center gap-1 text-sm text-emerald-700 hover:underline">
          Open Media Library <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      {images.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center text-neutral-400">
          <ImageIcon className="h-8 w-8" />
          <p className="text-sm">No images yet — add a hero image or gallery in the Content tab.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={url} alt="" className="h-28 w-full rounded-md border object-cover" />
          ))}
        </div>
      )}
      <p className="text-xs text-neutral-400">
        Section images added in the Design tab are managed there; this shows the page-level Content tab images.
      </p>
    </div>
  );
}
