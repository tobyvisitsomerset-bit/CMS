import Link from "next/link";
import { Star } from "lucide-react";
import { BusinessInfoPanel } from "./business-info-panel";
import type { BusinessInfo } from "@/lib/kentico-item-fields";
import type { getPageById, getNearbyPages } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type NearbyPage = Awaited<ReturnType<typeof getNearbyPages>>[number];

function breadcrumbFromSlug(slug: string): string[] {
  return slug.split("/").map((seg) =>
    seg
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
  );
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-neutral-200 text-neutral-200"}
        />
      ))}
    </span>
  );
}

export function ListingDetailPreview({
  page,
  info,
  gallery,
  bodyContent,
  nearby,
}: {
  page: PageDetail;
  info: BusinessInfo;
  gallery: string[];
  bodyContent: string | null;
  nearby: NearbyPage[];
}) {
  const images = [page.heroImageUrl, ...gallery].filter((u): u is string => !!u);
  const extraPhotoCount = images.length - 4;
  const avgRating = page.reviews.length
    ? page.reviews.reduce((sum, r) => sum + r.rating, 0) / page.reviews.length
    : null;

  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="border-b px-6 py-2 text-xs text-neutral-400">
        {breadcrumbFromSlug(page.slug).join(" / ")}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 grid-rows-2 gap-1 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="" className="col-span-2 row-span-2 aspect-[4/3] w-full rounded-l-md object-cover" />
          {images.slice(1, 4).map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className={`aspect-[16/10] w-full object-cover ${i === 1 ? "rounded-tr-md" : ""} ${i === 2 ? "rounded-br-md" : ""}`}
              />
              {i === 2 && extraPhotoCount > 0 && (
                <div className="absolute inset-0 flex items-center justify-center rounded-br-md bg-black/50 text-sm font-semibold text-white">
                  +{extraPhotoCount} photos
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 p-6 md:grid-cols-3">
        <div className="space-y-8 md:col-span-2">
          <div>
            {page.membershipTier && (
              <span className="mb-2 inline-block rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-semibold text-amber-950">
                Visit Somerset {page.membershipTier.charAt(0) + page.membershipTier.slice(1).toLowerCase()} Member
              </span>
            )}
            <h1 className="font-serif text-3xl font-bold text-neutral-900">{page.title}</h1>
            {page.subtitle && <p className="mt-1 text-neutral-500">{page.subtitle}</p>}
            {avgRating !== null && (
              <div className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                <Stars rating={avgRating} />
                <span className="font-medium">{avgRating.toFixed(1)}</span>
                <span className="text-neutral-400">
                  ({page.reviews.length} review{page.reviews.length === 1 ? "" : "s"})
                </span>
              </div>
            )}
          </div>

          {bodyContent && (
            <div className="space-y-2 border-t pt-6">
              <p className="whitespace-pre-wrap text-neutral-700">{bodyContent}</p>
            </div>
          )}

          {page.rooms.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-semibold text-neutral-900">Rooms available</h2>
              {page.rooms.map((room) => {
                const features: string[] = room.features ? JSON.parse(room.features) : [];
                return (
                  <div key={room.id} className="flex gap-3 rounded-lg border p-3">
                    {room.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={room.imageUrl} alt="" className="h-20 w-28 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="h-20 w-28 shrink-0 rounded-md bg-neutral-100" />
                    )}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-900">{room.name}</h3>
                        {room.description && <p className="text-xs text-neutral-500">{room.description}</p>}
                        {features.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {features.map((f) => (
                              <span key={f} className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between text-right">
                      {room.priceLabel && <span className="text-sm font-semibold text-neutral-900">{room.priceLabel}</span>}
                      {info.bookingUrl && (
                        <a
                          href={info.bookingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-emerald-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-900"
                        >
                          Reserve
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {page.reviews.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-semibold text-neutral-900">Reviews</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {page.reviews.map((review) => (
                  <div key={review.id} className="space-y-1 rounded-lg border p-3">
                    <Stars rating={review.rating} size={12} />
                    <p className="text-sm text-neutral-700">&ldquo;{review.quote}&rdquo;</p>
                    <p className="text-xs text-neutral-400">
                      {review.authorName}
                      {review.reviewDate ? ` · ${review.reviewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nearby.length > 0 && (
            <div className="space-y-3 border-t pt-6">
              <h2 className="text-lg font-semibold text-neutral-900">Nearby, worth the trip</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {nearby.map((n) => (
                  <Link key={n.id} href={`/cms/${n.id}`} className="group space-y-1">
                    {n.heroImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.heroImageUrl} alt="" className="aspect-square w-full rounded-md object-cover" />
                    ) : (
                      <div className="aspect-square w-full rounded-md bg-neutral-100" />
                    )}
                    <p className="truncate text-xs font-medium text-neutral-700 group-hover:underline">{n.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-1">
          <div className="sticky top-4">
            <BusinessInfoPanel info={info} />
          </div>
        </div>
      </div>
    </div>
  );
}
