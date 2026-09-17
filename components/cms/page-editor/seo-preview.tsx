import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type SeoValues = {
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  socialShareImage: string;
};

function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit;
  return (
    <p className={cn("text-[11px]", over ? "text-amber-600" : "text-neutral-400")}>
      {value.length}/{limit} characters
    </p>
  );
}

export function SeoPreview({
  values,
  title,
  subtitle,
  slug,
}: {
  values: SeoValues;
  title: string;
  subtitle: string | null;
  slug: string;
}) {
  const displayTitle = values.seoTitle || title;
  const displayDescription = values.seoDescription || subtitle || "";
  const ogDisplayTitle = values.ogTitle || values.seoTitle || title;
  const ogDisplayDescription = values.ogDescription || values.seoDescription || subtitle || "";
  const crumbs = slug.split("/").join(" › ");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Google preview</h3>
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 text-xs text-neutral-600">
            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-somerset-green text-[8px] font-bold text-white">
              V
            </span>
            <span className="truncate">
              visitsomerset.co.uk{crumbs ? ` › ${crumbs}` : ""}
            </span>
          </div>
          <p className="mt-1 max-w-[560px] truncate text-lg text-[#1a0dab]">{displayTitle}</p>
          <CharCount value={displayTitle} limit={60} />
          <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{displayDescription}</p>
          <CharCount value={displayDescription} limit={155} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Social card preview</h3>
        <div className="overflow-hidden rounded-lg border">
          <div className="flex aspect-[1.91/1] items-center justify-center bg-neutral-100">
            {values.socialShareImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- external/dynamic upload paths, not build-time known
              <img src={values.socialShareImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-neutral-300" />
            )}
          </div>
          <div className="space-y-0.5 p-3">
            <p className="text-xs uppercase text-neutral-400">visitsomerset.co.uk</p>
            <p className="line-clamp-1 text-sm font-medium text-neutral-800">{ogDisplayTitle}</p>
            <p className="line-clamp-1 text-xs text-neutral-500">{ogDisplayDescription}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
