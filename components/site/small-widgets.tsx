import Link from "next/link";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { NewsletterForm } from "@/components/site/newsletter-form";
import { EnquiryForm } from "@/components/site/detail/enquiry-form";
import { HomepageSearchBar } from "@/components/site/homepage-search-bar";
import { EventForm } from "@/components/site/event-form";
import { cn } from "@/lib/utils";

export function ButtonWidget({ label, url, style, align }: { label?: string; url?: string; style?: string; align?: string }) {
  const cls = cn(
    "inline-block rounded-full px-7 py-3 text-sm font-bold transition-opacity hover:opacity-90",
    style === "green" ? "bg-somerset-green text-white" : style === "outline" ? "border border-stone-400 text-stone-900" : "bg-damson text-white",
  );
  return (
    <section className="px-6 py-6">
      <div className={cn("mx-auto max-w-7xl", align === "center" ? "text-center" : align === "right" ? "text-right" : "")}>
        {url ? (
          <Link href={url} className={cls}>
            {label || "Button"}
          </Link>
        ) : (
          <span className={cls}>{label || "Button"}</span>
        )}
      </div>
    </section>
  );
}

export function NewsletterBar({ heading, text }: { heading?: string; text?: string }) {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-[2rem] bg-somerset-green px-8 py-8 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-serif text-2xl font-black">{heading || "The Somerset newsletter"}</p>
          {text && <p className="mt-1 text-sm text-white/85">{text}</p>}
        </div>
        <NewsletterForm source="widget" />
      </div>
    </section>
  );
}

export function Spotlight({
  eyebrow,
  heading,
  text,
  imageUrl,
  ctaLabel,
  ctaUrl,
}: {
  eyebrow?: string;
  heading?: string;
  text?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
}) {
  return (
    <section className="px-6 py-10">
      <div className="relative isolate mx-auto flex min-h-80 max-w-7xl items-end overflow-hidden rounded-[2rem] bg-gradient-to-br from-somerset-green to-deep-green text-white">
        {imageUrl && <Img src={imageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full" />}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-deep-green/85 via-deep-green/30 to-transparent" />
        <div className="max-w-2xl p-8 sm:p-12">
          {eyebrow && <p className="mb-2 text-[11px] font-semibold tracking-[0.2em] text-white/80 uppercase">{eyebrow}</p>}
          {heading && <h2 className="font-serif text-4xl font-black sm:text-5xl">{heading}</h2>}
          {text && <p className="mt-3 text-white/90">{text}</p>}
          {ctaLabel && ctaUrl && (
            <Link href={ctaUrl} className="mt-5 inline-block rounded-full bg-damson px-6 py-3 text-sm font-bold text-white hover:opacity-90">
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export function AdBar({ imageUrl, url, alt, label }: { imageUrl?: string; url?: string; alt?: string; label?: string }) {
  const img = <Img src={imageUrl || null} alt={alt ?? ""} label={alt || "Advertisement"} className="h-24 w-full rounded-2xl sm:h-28" />;
  return (
    <section className="px-6 py-6">
      <div className="mx-auto max-w-7xl">
        <p className="mb-1 text-[10px] font-semibold tracking-widest text-stone-400 uppercase">{label || "Advertisement"}</p>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer sponsored" className="block">
            {img}
          </a>
        ) : (
          img
        )}
      </div>
    </section>
  );
}

export function ContactFormWidget({ heading, intro, pageId, pageTitle }: { heading?: string; intro?: string; pageId?: string; pageTitle?: string }) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-xl">
        <h2 className="font-serif text-3xl font-black text-stone-900">{heading || "Get in touch"}</h2>
        {intro && <p className="mt-2 text-stone-600">{intro}</p>}
        <div className="mt-5">
          {pageId ? (
            <EnquiryForm pageId={pageId} title={pageTitle || "this page"} withDates={false} defaults={{}} />
          ) : (
            <p className="rounded-2xl bg-cool-grey p-4 text-sm text-stone-500">The contact form appears here on the live page.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export function PageCards({
  title,
  cards,
}: {
  title?: string;
  cards: { id: string; title: string; subtitle: string | null; slug: string; heroImageUrl: string | null }[];
}) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-serif text-3xl font-black text-stone-900">{title || "You might like"}</h2>
        <div className="mt-6 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {cards.map((c) => (
            <Link key={c.id} href={`/${c.slug}`} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white transition-shadow hover:shadow-md">
              <Img src={c.heroImageUrl} alt="" label={c.title} className="aspect-[4/3] w-full" />
              <div className="p-4">
                <p className="font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{c.title}</p>
                {c.subtitle && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{c.subtitle}</p>}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AvailabilitySearch({ title, text }: { title?: string; text?: string }) {
  return (
    <section className="bg-cool-grey px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center font-serif text-3xl font-black text-stone-900">{title || "Find somewhere to stay"}</h2>
        {text && <p className="mx-auto mt-2 max-w-2xl text-center text-stone-600">{text}</p>}
        <div className="mt-6">
          <HomepageSearchBar />
        </div>
      </div>
    </section>
  );
}

export function EventFormWidget({ heading, intro, pageId }: { heading?: string; intro?: string; pageId?: string }) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-xl">
        <h2 className="font-serif text-3xl font-black text-stone-900">{heading || "Submit your event"}</h2>
        {intro && <p className="mt-2 text-stone-600">{intro}</p>}
        <div className="mt-5">
          {pageId ? (
            <EventForm pageId={pageId} />
          ) : (
            <p className="rounded-2xl bg-cool-grey p-4 text-sm text-stone-500">The event form appears here on the live page.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function safeHttps(url?: string): string | null {
  try {
    const u = new URL(url ?? "");
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

// An external tool shown inside the page (e.g. Traveline's journey planner).
export function EmbedWidget({ heading, url, height, linkLabel }: { heading?: string; url?: string; height?: number; linkLabel?: string }) {
  const src = safeHttps(url);
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {heading && <h2 className="mb-4 font-serif text-3xl font-black text-stone-900">{heading}</h2>}
        {src ? (
          <>
            <iframe
              src={src}
              title={heading || "Embedded tool"}
              loading="lazy"
              style={{ height: Math.min(Math.max(Number(height) || 600, 200), 1400) }}
              className="w-full rounded-3xl border border-stone-200 bg-white"
            />
            <a href={src} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold text-somerset-green hover:underline">
              {linkLabel || "Open in a new tab"} →
            </a>
          </>
        ) : (
          <p className="rounded-2xl bg-cool-grey p-6 text-sm text-stone-500">Add a secure (https) link in this widget&apos;s properties to show the tool here.</p>
        )}
      </div>
    </section>
  );
}

export function SocialPanel({
  heading,
  handle,
  profileUrl,
  images,
}: {
  heading?: string;
  handle?: string;
  profileUrl?: string;
  images?: { imageUrl?: string; url?: string }[];
}) {
  const list = images ?? [];
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-serif text-3xl font-black text-stone-900">{heading || "On Instagram"}</h2>
          {profileUrl && (
            <a href={profileUrl} target="_blank" rel="noreferrer" className="text-sm font-bold text-somerset-green hover:underline">
              {handle || "Follow us"} →
            </a>
          )}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((img, i) => {
            const tile = <Img src={img.imageUrl || null} alt="" label={handle} className="aspect-square w-full rounded-2xl" />;
            return img.url ? (
              <a key={i} href={img.url} target="_blank" rel="noreferrer" className="block transition-opacity hover:opacity-90">
                {tile}
              </a>
            ) : (
              <div key={i}>{tile}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
