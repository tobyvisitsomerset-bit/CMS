import Link from "next/link";
import { Camera, ChevronRight, Crown, Quote, Star } from "lucide-react";
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
          className={n <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-stone-200 text-stone-200"}
        />
      ))}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-3 font-serif text-xl font-semibold text-stone-900">
      {children}
      <span className="h-px flex-1 bg-stone-200" />
    </h2>
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
  const crumbs = breadcrumbFromSlug(page.slug);

  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-16px_rgba(0,0,0,0.12)]">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-100 px-6 py-3 text-xs text-stone-400">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="size-3 text-stone-300" />}
            <span className={i === crumbs.length - 1 ? "font-medium text-stone-500" : ""}>{c}</span>
          </span>
        ))}
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-4 grid-rows-2 gap-1.5 bg-stone-100 p-1.5">
          <div className="group col-span-2 row-span-2 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[0]}
              alt=""
              className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          {images.slice(1, 4).map((url, i) => (
            <div key={url} className="group relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="aspect-[16/10] w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {i === 2 && extraPhotoCount > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-stone-900/55 text-white backdrop-blur-[1px]">
                  <Camera className="size-4" />
                  <span className="text-sm font-semibold">+{extraPhotoCount} photos</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 p-6 sm:p-8 md:grid-cols-3">
        <div className="space-y-10 md:col-span-2">
          <div>
            {page.membershipTier && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-300 px-3 py-1 text-xs font-semibold text-amber-950 shadow-sm shadow-amber-900/10">
                <Crown className="size-3.5" />
                Visit Somerset {page.membershipTier.charAt(0) + page.membershipTier.slice(1).toLowerCase()} Member
              </span>
            )}
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900">{page.title}</h1>
            {page.subtitle && <p className="mt-2 text-[15px] text-stone-500">{page.subtitle}</p>}
            {avgRating !== null && (
              <div className="mt-3 flex items-center gap-2 text-sm text-stone-600">
                <Stars rating={avgRating} />
                <span className="font-semibold text-stone-800">{avgRating.toFixed(1)}</span>
                <span className="text-stone-400">
                  · {page.reviews.length} review{page.reviews.length === 1 ? "" : "s"}
                </span>
              </div>
            )}
          </div>

          {bodyContent && (
            <div className="border-t border-stone-100 pt-8">
              <p className="whitespace-pre-wrap leading-relaxed text-stone-600">{bodyContent}</p>
            </div>
          )}

          {page.rooms.length > 0 && (
            <div className="space-y-4 border-t border-stone-100 pt-8">
              <SectionHeading>Rooms available</SectionHeading>
              <div className="space-y-3">
                {page.rooms.map((room) => {
                  const features: string[] = room.features ? JSON.parse(room.features) : [];
                  return (
                    <div
                      key={room.id}
                      className="flex gap-4 rounded-2xl border border-stone-200 p-3 transition-shadow hover:shadow-md hover:shadow-stone-200/60"
                    >
                      {room.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={room.imageUrl} alt="" className="h-24 w-32 shrink-0 rounded-xl object-cover" />
                      ) : (
                        <div className="h-24 w-32 shrink-0 rounded-xl bg-stone-100" />
                      )}
                      <div className="flex flex-1 flex-col justify-center gap-1">
                        <h3 className="text-sm font-semibold text-stone-900">{room.name}</h3>
                        {room.description && <p className="text-xs text-stone-500">{room.description}</p>}
                        {features.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {features.map((f) => (
                              <span
                                key={f}
                                className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800"
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end justify-center gap-2 text-right">
                        {room.priceLabel && (
                          <span className="font-serif text-lg font-semibold text-stone-900">{room.priceLabel}</span>
                        )}
                        {info.bookingUrl && (
                          <a
                            href={info.bookingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-emerald-800 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-900"
                          >
                            Reserve
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {page.reviews.length > 0 && (
            <div className="space-y-4 border-t border-stone-100 pt-8">
              <SectionHeading>Reviews</SectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {page.reviews.map((review) => (
                  <div key={review.id} className="relative space-y-2 rounded-2xl bg-stone-50 p-4">
                    <Quote className="absolute top-3 right-3 size-6 text-stone-200" />
                    <Stars rating={review.rating} size={12} />
                    <p className="pr-4 text-sm leading-relaxed text-stone-700">{review.quote}</p>
                    <p className="text-xs font-medium text-stone-400">
                      {review.authorName}
                      {review.reviewDate
                        ? ` · ${review.reviewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {nearby.length > 0 && (
            <div className="space-y-4 border-t border-stone-100 pt-8">
              <SectionHeading>Nearby, worth the trip</SectionHeading>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {nearby.map((n) => (
                  <Link key={n.id} href={`/cms/${n.id}`} className="group space-y-2">
                    <div className="overflow-hidden rounded-xl">
                      {n.heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={n.heroImageUrl}
                          alt=""
                          className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="aspect-square w-full bg-stone-100" />
                      )}
                    </div>
                    <p className="truncate text-xs font-medium text-stone-600 group-hover:text-emerald-800">
                      {n.title}
                    </p>
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
