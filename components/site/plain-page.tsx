import Link from "next/link";
import { Img } from "@/components/cms/page-builder/listing-ui";
import type { ChildPageTile } from "@/lib/data/pages";
import { ScriptText } from "@/components/site/script-text";
import { focusStyle, plainTitle } from "@/lib/page-display";
import { cn } from "@/lib/utils";

// The public layout for a page with no widget blocks and no business data —
// section indexes (Bath, Taunton, Business in Somerset...) and plain copy
// pages (Accessibility, Terms of use...). A banner, readable prose and, for
// folders, a grid of the real child pages.
export function PlainPage({
  title,
  subtitle,
  body,
  heroImageUrl,
  gallery,
  childPages,
  cta,
  titleMarkup,
  subtitleScript = false,
  subtitleAbove = false,
  focus = null,
}: {
  title: string;
  /** Display title; *words* use the script font. Falls back to title. */
  titleMarkup?: string;
  subtitleScript?: boolean;
  subtitleAbove?: boolean;
  focus?: string | null;
  subtitle: string | null;
  body: string | null;
  heroImageUrl: string | null;
  gallery: string[];
  childPages: ChildPageTile[];
  cta?: { label: string; url: string } | null;
}) {
  const paragraphs = (body ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-somerset-green to-deep-green text-white">
        {heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroImageUrl} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" style={focusStyle(focus)} />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-deep-green/80 via-deep-green/30 to-transparent" />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-12">
          <nav aria-label="Breadcrumb" className="mb-3 text-xs text-white/70">
            <Link href="/" className="hover:underline">
              Home
            </Link>{" "}
            / <span className="text-white">{plainTitle(titleMarkup ?? title)}</span>
          </nav>
          {subtitle && subtitleAbove && (
            <p className={cn("mb-2 max-w-2xl text-white/90", subtitleScript ? "font-script text-3xl sm:text-4xl" : "text-lg")}>{subtitle}</p>
          )}
          <h1 className="font-serif text-4xl leading-tight font-black tracking-tight sm:text-6xl">
            <ScriptText text={titleMarkup ?? title} className="text-[1.15em]" />
          </h1>
          {subtitle && !subtitleAbove && (
            <p className={cn("mt-3 max-w-2xl text-white/90", subtitleScript ? "font-script text-3xl" : "text-lg")}>{subtitle}</p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10">
        {paragraphs.length > 0 && (
          <div className="max-w-3xl space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="leading-relaxed whitespace-pre-wrap text-stone-700">
                {p}
              </p>
            ))}
          </div>
        )}

        {gallery.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="aspect-square w-full rounded-3xl object-cover" />
            ))}
          </div>
        )}

        {cta?.label && (
          <a href={cta.url || "#"} className="mt-8 inline-block rounded-full bg-damson px-6 py-3 text-sm font-bold text-white hover:opacity-90">
            {cta.label}
          </a>
        )}

        {childPages.length > 0 && (
          <div className={paragraphs.length > 0 ? "mt-12" : ""}>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {childPages.map((child) => (
                <Link key={child.id} href={`/${child.slug}`} className="group flex flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white transition-shadow hover:shadow-md">
                  <Img src={child.heroImageUrl} alt="" label={child.title} className="aspect-[4/3] w-full" />
                  <div className="p-4">
                    <p className="font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{child.title}</p>
                    {child.subtitle && <p className="mt-1 line-clamp-2 text-sm text-stone-500">{child.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
