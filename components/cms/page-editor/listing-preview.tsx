import { StatusDot } from "@/components/cms/status-dot";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

export function ListingPreview({ page }: { page: PageDetail }) {
  return (
    <div className="p-8">
      <p className="mb-4 text-sm text-neutral-500">How this page appears as a card in listing &amp; grid views:</p>
      <div className="w-72 overflow-hidden rounded-lg border bg-white shadow-sm">
        <div
          className="h-36 bg-gradient-to-br from-emerald-700 to-emerald-950 bg-cover bg-center"
          style={page.heroImageUrl ? { backgroundImage: `url(${page.heroImageUrl})` } : undefined}
        />
        <div className="space-y-1.5 p-3">
          <div className="flex items-center gap-1.5">
            <StatusDot status={page.status} />
            <h3 className="truncate text-sm font-semibold">{page.title}</h3>
          </div>
          {page.subtitle && <p className="line-clamp-2 text-xs text-neutral-500">{page.subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
