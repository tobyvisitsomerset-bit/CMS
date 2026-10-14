import { ListingDetail } from "@/components/site/detail/listing-detail";
import type { DetailExtras } from "@/lib/data/detail-extras";
import type { BusinessInfo } from "@/lib/kentico-item-fields";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

// Thin wrapper kept so the CMS Preview tab and the public site render the
// exact same detail layout (components/site/detail/listing-detail.tsx).
export function ListingDetailPreview({
  page,
  info,
  gallery,
  bodyContent,
  extras,
  linkBase = "/cms",
  searchParams = {},
}: {
  page: PageDetail;
  info: BusinessInfo;
  gallery: string[];
  bodyContent: string | null;
  extras: DetailExtras;
  // "/cms" inside the editor's Preview tab, "" on the public site.
  linkBase?: string;
  searchParams?: Record<string, string | undefined>;
}) {
  return (
    <ListingDetail
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
