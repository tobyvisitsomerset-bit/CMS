import Link from "next/link";
import { Camera, Clock, ExternalLink, Mail, MapPin, Phone, Star, Ticket } from "lucide-react";
import { AddToCalendarMenu } from "@/components/calendar/add-to-calendar-menu";
import { AddToTripPill } from "@/components/trip/add-to-trip-pill";
import { SinglePinMap } from "@/components/map/single-pin-map";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { EnquiryForm } from "./enquiry-form";
import { ShareButton } from "./share-button";
import { formatMiles, type DetailExtras, type NearbyPlace } from "@/lib/data/detail-extras";
import { parsePrice } from "@/lib/data/listing-explorer";
import { decodeKenticoText, getAllFieldValues, parseCustomFields, type BusinessInfo } from "@/lib/kentico-item-fields";
import { labelForSlugSegment } from "@/lib/site-nav";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} width={size} height={size} className={n <= Math.round(rating) ? "fill-damson text-damson" : "fill-stone-200 text-stone-200"} />
      ))}
    </span>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-2xl font-black text-stone-900">{children}</h2>;
}

function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString("en-GB", opts);
}

function timeOf(iso: string | null): string | null {
  if (!iso) return null;
  // Kentico date-only values sit at midnight; only show a time when there is one.
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m || (m[1] === "00" && m[2] === "00")) return null;
  return `${m[1]}:${m[2]}`;
}

function paragraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function PlaceCard({ p, linkBase, eyebrow }: { p: NearbyPlace; linkBase: string; eyebrow?: string }) {
  return (
    <Link
      href={linkBase ? `${linkBase}/${p.id}` : `/${p.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white transition-shadow hover:shadow-md"
    >
      <Img src={p.heroImageUrl} alt="" label={p.title} className="aspect-[16/10] w-full" />
      <div className="p-4">
        <p className="text-[11px] font-semibold tracking-wider text-somerset-green uppercase">{eyebrow ?? formatMiles(p.miles)}</p>
        <p className="mt-0.5 font-serif text-base leading-tight font-black text-stone-900 group-hover:text-somerset-green">{p.title}</p>
        {p.town && <p className="mt-0.5 text-xs text-stone-500">{p.town}</p>}
      </div>
    </Link>
  );
}

export function ListingDetail({
  page,
  info,
  gallery,
  bodyContent,
  extras,
  linkBase,
  searchParams,
}: {
  page: PageDetail;
  info: BusinessInfo;
  gallery: string[];
  bodyContent: string | null;
  extras: DetailExtras;
  linkBase: string;
  searchParams: Record<string, string | undefined>;
}) {
  const isPublic = linkBase !== "/cms";
  const fields = parseCustomFields(page.customFields);
  const isEvent = !!info.startDate;
  const isStay = page.slug.startsWith("places-to-stay/");
  const images = [page.heroImageUrl, ...gallery].filter((u): u is string => !!u);
  const avgRating = page.reviews.length ? page.reviews.reduce((s, r) => s + r.rating, 0) / page.reviews.length : null;
  const gradings = Array.from(new Set(getAllFieldValues(page.customFields, "ItemGradingName")));
  if (fields.ItemGrading && !gradings.includes(fields.ItemGrading)) gradings.unshift(fields.ItemGrading);
  const price = parsePrice(info.admission);
  const sectionSlug = page.slug.split("/")[0];
  const sectionLabel = labelForSlugSegment(sectionSlug);
  const fullAddress = [info.address, info.town, info.postcode].filter(Boolean).join(", ");
  const roadDirections = decodeKenticoText(fields.ItemRoadDirections);
  const transport = decodeKenticoText(fields.ItemPublicTransportDirections);
  const generalOpening = decodeKenticoText(fields.ItemGeneralOpeningInformation);
  const body = paragraphs(bodyContent);
  const rawHeadline = page.subtitle && page.subtitle.length <= 160 ? decodeKenticoText(page.subtitle) : null;
  // Skip the editorial headline when the body simply opens with the same words.
  const headline =
    rawHeadline && body[0] && body[0].toLowerCase().startsWith(rawHeadline.slice(0, 40).toLowerCase()) ? null : rawHeadline;
  const startTime = timeOf(info.startDate);
  const endTime = timeOf(info.endDate);
  const eventObj =
    isEvent && info.startDate
      ? {
          title: page.title,
          location: fullAddress || undefined,
          start: new Date(info.startDate),
          end: info.endDate ? new Date(info.endDate) : undefined,
          allDay: !startTime,
        }
      : null;
  const seasonCal =
    extras.season && eventObj
      ? {
          label: extras.season.label,
          events: [
            eventObj,
            ...extras.season.events.map((e) => ({
              title: e.title,
              start: new Date(e.startDate),
              end: e.endDate ? new Date(e.endDate) : undefined,
              allDay: !timeOf(e.startDate),
              location: e.town ?? undefined,
            })),
          ],
        }
      : undefined;

  const tripPayload = { id: page.id, title: page.title, slug: page.slug, heroImageUrl: page.heroImageUrl };
  const website = info.website;
  const mapsHref =
    info.mapLat != null && info.mapLng != null
      ? `https://www.google.com/maps/search/?api=1&query=${info.mapLat},${info.mapLng}`
      : fullAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
        : null;

  const extraPhotos = Math.max(0, images.length - 5);

  const titleBlock = (
    <div>
      <div className="flex flex-wrap gap-2">
        {page.membershipTier && (
          <span className="rounded-full bg-damson/10 px-3 py-1 text-xs font-bold text-damson">Visit Somerset member</span>
        )}
        {gradings.slice(0, 3).map((g) => (
          <span key={g} className="rounded-full bg-cool-grey px-3 py-1 text-xs font-medium text-stone-700">
            {g}
          </span>
        ))}
        {isEvent && <span className="rounded-full bg-cool-grey px-3 py-1 text-xs font-medium text-stone-700">Event</span>}
      </div>
      <h1 className="mt-3 font-serif text-4xl leading-tight font-black tracking-tight text-stone-900 sm:text-5xl">{page.title}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-stone-600">
        {avgRating !== null && (
          <span className="flex items-center gap-2">
            <Stars rating={avgRating} />
            <strong className="text-stone-900">{avgRating.toFixed(1)}</strong>
            <span className="text-stone-400">
              · {page.reviews.length} review{page.reviews.length === 1 ? "" : "s"}
            </span>
          </span>
        )}
        {isEvent && info.startDate ? (
          <span className="font-medium text-stone-800">
            {fmtDate(info.startDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {info.endDate && info.endDate.slice(0, 10) !== info.startDate.slice(0, 10)
              ? ` – ${fmtDate(info.endDate, { day: "numeric", month: "long", year: "numeric" })}`
              : ""}
            {startTime ? ` · ${startTime}${endTime ? `–${endTime}` : ""}` : ""}
          </span>
        ) : null}
        {fullAddress && (
          <span className="flex items-center gap-2">
            <MapPin className="size-4 text-somerset-green" />
            {fullAddress}
            {info.mapLat != null && (
              <a href="#location" className="font-semibold text-somerset-green hover:underline">
                Show on map
              </a>
            )}
          </span>
        )}
      </div>
      {isPublic && (
        <div className="mt-5 flex flex-wrap gap-2">
          <AddToTripPill {...tripPayload} variant="save" />
          <AddToTripPill {...tripPayload} variant="trip" dateKey={info.startDate} />
          {eventObj && <AddToCalendarMenu event={eventObj} path={`/${page.slug}`} season={seasonCal} />}
          <ShareButton title={page.title} />
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
        <Link href={isPublic ? "/" : "/cms"} className="hover:underline">
          Home
        </Link>
        <span>/</span>
        <Link href={isPublic ? `/${sectionSlug}` : "#"} className="hover:underline">
          {sectionLabel}
        </Link>
        <span>/</span>
        <span className="text-stone-700">{page.title}</span>
      </nav>

      {/* Gallery or banner */}
      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="" className="col-span-2 row-span-2 h-full w-full object-cover" />
          {images.slice(1, 5).map((url, i) => (
            <div key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-[4/3] h-full w-full object-cover" />
              {i === 3 && extraPhotos > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-deep-green/70 text-white">
                  <Camera className="size-4" />
                  <span className="text-sm font-bold">+{extraPhotos} photos</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-3xl">
          <Img src={images[0] ?? null} alt="" label={page.title} className="h-56 w-full sm:h-72" />
        </div>
      )}

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-12">
          {titleBlock}

          {(headline || body.length > 0) && (
            <section className="space-y-4 border-t border-stone-200 pt-8">
              {headline && <H2>{headline}</H2>}
              {body.map((p, i) => (
                <p key={i} className="leading-relaxed text-stone-700">
                  {p}
                </p>
              ))}
            </section>
          )}

          {page.rooms.length > 0 && (
            <section className="space-y-4">
              <H2>Rooms</H2>
              <div className="space-y-3">
                {page.rooms.map((room) => {
                  const features: string[] = room.features ? JSON.parse(room.features) : [];
                  return (
                    <div key={room.id} className="flex flex-wrap items-center gap-4 rounded-3xl border border-stone-200 p-4">
                      <Img src={room.imageUrl} alt="" label={room.name} className="h-20 w-24 shrink-0 rounded-2xl" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-serif text-lg font-black text-stone-900">{room.name}</h3>
                        {room.description && <p className="text-sm text-stone-500">{room.description}</p>}
                        {features.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {features.map((f) => (
                              <span key={f} className="rounded-full bg-cool-grey px-2.5 py-0.5 text-[11px] font-medium text-stone-700">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        {room.priceLabel && <span className="font-serif text-xl font-black text-stone-900">{room.priceLabel}</span>}
                        {info.bookingUrl ? (
                          <a href={info.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full bg-damson px-5 py-2 text-sm font-bold text-white hover:opacity-90">
                            Reserve
                          </a>
                        ) : (
                          <a href="#enquire" className="rounded-full bg-damson px-5 py-2 text-sm font-bold text-white hover:opacity-90">
                            Enquire
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {(info.openingTimes || generalOpening || (info.admission && !isEvent)) && (
            <section className="space-y-3">
              <H2>Good to know</H2>
              <dl className="divide-y divide-stone-100 rounded-3xl border border-stone-200 text-sm">
                {info.openingTimes && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 p-4">
                    <dt className="text-stone-500">Opening times</dt>
                    <dd className="text-stone-800">{info.openingTimes}</dd>
                  </div>
                )}
                {generalOpening && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 p-4">
                    <dt className="text-stone-500">Opening information</dt>
                    <dd className="text-stone-800">{generalOpening}</dd>
                  </div>
                )}
                {info.admission && !isEvent && (
                  <div className="grid grid-cols-[9rem_1fr] gap-4 p-4">
                    <dt className="text-stone-500">{isStay ? "Prices" : "Admission"}</dt>
                    <dd className="text-stone-800">{info.admission}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {(roadDirections || transport) && (
            <section className="space-y-3">
              <H2>Getting here</H2>
              <ul className="space-y-2 text-sm text-stone-700">
                {roadDirections && (
                  <li className="rounded-2xl bg-cool-grey p-4">
                    <strong className="text-stone-900">By road. </strong>
                    {roadDirections}
                  </li>
                )}
                {transport && (
                  <li className="rounded-2xl bg-cool-grey p-4">
                    <strong className="text-stone-900">Public transport. </strong>
                    {transport}
                  </li>
                )}
              </ul>
            </section>
          )}

          {page.reviews.length > 0 && (
            <section className="space-y-4">
              <H2>Reviews</H2>
              <div className="grid gap-3 sm:grid-cols-2">
                {page.reviews.map((review) => (
                  <div key={review.id} className="space-y-2 rounded-3xl bg-cool-grey p-5">
                    <Stars rating={review.rating} size={12} />
                    <p className="text-sm leading-relaxed text-stone-800">&ldquo;{review.quote}&rdquo;</p>
                    <p className="text-xs font-medium text-stone-500">
                      {review.authorName}
                      {review.reviewDate ? ` · ${review.reviewDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {isEvent && extras.nearbyStays.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <H2>Stay the night</H2>
                <Link href={`/places-to-stay${info.town ? `?q=${encodeURIComponent(info.town)}` : ""}`} className="text-sm font-bold text-somerset-green hover:underline">
                  All places to stay →
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {extras.nearbyStays.map((p) => (
                  <PlaceCard key={p.id} p={p} linkBase={isPublic ? "" : "/cms"} />
                ))}
              </div>
            </section>
          )}

          {extras.season && extras.season.events.length > 0 && (
            <section className="space-y-4">
              <H2>More from {extras.season.label}</H2>
              <div className="space-y-2">
                {extras.season.events.map((e) => (
                  <Link
                    key={e.id}
                    href={isPublic ? `/${e.slug}` : `/cms/${e.id}`}
                    className="flex items-center gap-4 rounded-3xl border border-stone-200 p-4 hover:border-somerset-green"
                  >
                    <div className="w-12 text-center">
                      <p className="font-serif text-2xl leading-none font-black text-stone-900">{fmtDate(e.startDate, { day: "numeric" })}</p>
                      <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">{fmtDate(e.startDate, { month: "short" })}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-base font-black text-stone-900">{e.title}</p>
                      {e.town && <p className="text-xs text-stone-500">{e.town}</p>}
                    </div>
                    <span className="rounded-full border border-stone-300 px-3.5 py-1.5 text-sm font-bold text-stone-800">Details</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!isEvent && extras.nearbyPlaces.length > 0 && (
            <section className="space-y-4">
              <H2>Nearby, and worth the trip</H2>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {extras.nearbyPlaces.map((p) => (
                  <PlaceCard key={p.id} p={p} linkBase={isPublic ? "" : "/cms"} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sticky rail */}
        <aside className="space-y-5 lg:sticky lg:top-32 lg:self-start">
          {isEvent ? (
            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]">
              <h3 className="font-serif text-xl font-black text-stone-900">Tickets &amp; entry</h3>
              <p className="mt-2 text-sm text-stone-700">{info.admission || "See the organiser's website for ticket and entry details."}</p>
              <div className="mt-4 flex flex-col gap-2">
                {info.bookingUrl ? (
                  <a href={info.bookingUrl} target="_blank" rel="noreferrer" className="rounded-full bg-damson px-5 py-3 text-center text-sm font-bold text-white hover:opacity-90">
                    {info.bookingLabel || "Book tickets"}
                  </a>
                ) : website ? (
                  <a href={website} target="_blank" rel="noreferrer" className="rounded-full bg-somerset-green px-5 py-3 text-center text-sm font-bold text-white hover:opacity-90">
                    Visit the event website
                  </a>
                ) : null}
                {isPublic && <AddToTripPill {...tripPayload} variant="trip" dateKey={info.startDate} fullWidth />}
              </div>
            </div>
          ) : (
            <EnquiryForm
              pageId={page.id}
              title={page.title}
              withDates={isStay}
              defaults={{ checkIn: searchParams.checkin, checkOut: searchParams.checkout, guests: searchParams.guests }}
              priceLine={price.from ? { amount: `£${price.from}`, unit: price.unit } : null}
              readOnly={!isPublic}
            />
          )}

          {!isEvent && info.bookingUrl && (
            <a
              href={info.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-full border border-damson px-5 py-3 text-sm font-bold text-damson hover:bg-damson/5"
            >
              <Ticket className="size-4" />
              {info.bookingLabel || "Book online"}
            </a>
          )}

          {isEvent && (
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <h3 className="font-serif text-xl font-black text-stone-900">At a glance</h3>
              <dl className="mt-3 divide-y divide-stone-100 text-sm">
                {info.startDate && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-stone-500">Date</dt>
                    <dd className="text-right font-medium text-stone-900">
                      {fmtDate(info.startDate, { day: "numeric", month: "short", year: "numeric" })}
                      {info.endDate && info.endDate.slice(0, 10) !== info.startDate.slice(0, 10)
                        ? ` – ${fmtDate(info.endDate, { day: "numeric", month: "short" })}`
                        : ""}
                    </dd>
                  </div>
                )}
                {startTime && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-stone-500">Time</dt>
                    <dd className="font-medium text-stone-900">
                      {startTime}
                      {endTime ? `–${endTime}` : ""}
                    </dd>
                  </div>
                )}
                {(info.town || info.address) && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-stone-500">Where</dt>
                    <dd className="text-right font-medium text-stone-900">{info.address || info.town}</dd>
                  </div>
                )}
                {info.admission && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-stone-500">Admission</dt>
                    <dd className="text-right font-medium text-stone-900">{info.admission}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {isEvent && isPublic && (
            <div className="rounded-3xl bg-somerset-green p-6 text-white">
              <h3 className="font-serif text-xl font-black">Make a weekend of it</h3>
              <p className="mt-1 text-sm text-white/90">Find somewhere to stay near {info.town || "the event"} and add it all to one trip.</p>
              <Link
                href={`/places-to-stay${info.town ? `?q=${encodeURIComponent(info.town)}` : ""}`}
                className="mt-4 inline-block rounded-full bg-white px-5 py-2.5 text-sm font-bold text-deep-green hover:opacity-90"
              >
                Find places to stay
              </Link>
            </div>
          )}

          <div className="space-y-3 rounded-3xl border border-stone-200 bg-white p-5">
            <h3 className="font-serif text-xl font-black text-stone-900">Contact</h3>
            <ul className="space-y-2.5 text-sm text-stone-700">
              {info.phone && (
                <li className="flex items-center gap-3">
                  <Phone className="size-4 shrink-0 text-somerset-green" />
                  <a href={`tel:${info.phone.replace(/\s+/g, "")}`} className="hover:text-somerset-green hover:underline">
                    {info.phone}
                  </a>
                </li>
              )}
              {info.email && (
                <li className="flex items-center gap-3">
                  <Mail className="size-4 shrink-0 text-somerset-green" />
                  <a href={`mailto:${info.email}`} className="break-all hover:text-somerset-green hover:underline">
                    {info.email}
                  </a>
                </li>
              )}
              {website && (
                <li className="flex items-center gap-3">
                  <ExternalLink className="size-4 shrink-0 text-somerset-green" />
                  <a href={website} target="_blank" rel="noreferrer" className="break-all font-semibold text-somerset-green hover:underline">
                    Visit website
                  </a>
                </li>
              )}
              {info.openingTimes && !isEvent && (
                <li className="flex items-start gap-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-somerset-green" />
                  <span className="line-clamp-4">{info.openingTimes}</span>
                </li>
              )}
              {!info.phone && !info.email && !website && <li className="text-stone-500">Contact details aren&apos;t listed yet.</li>}
            </ul>
          </div>

          {info.mapLat != null && info.mapLng != null && (
            <div id="location" className="scroll-mt-32 space-y-2">
              <SinglePinMap lat={info.mapLat} lng={info.mapLng} title={page.title} />
              <div className="flex items-center justify-between text-sm">
                <Link href={isPublic ? "/interactive-map" : "#"} className="font-bold text-somerset-green hover:underline">
                  Open in map
                </Link>
                {mapsHref && (
                  <a href={mapsHref} target="_blank" rel="noreferrer" className="font-medium text-stone-600 hover:underline">
                    Get directions
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
