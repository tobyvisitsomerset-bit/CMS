import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Img } from "@/components/cms/page-builder/listing-ui";
import { cn } from "@/lib/utils";

export type PanelItem = { title?: string; text?: string; imageUrl?: string; url?: string };

export type ContentPanelConfig = {
  layout?: string;
  eyebrow?: string;
  heading?: string;
  body?: string;
  imageUrl?: string;
  imageAlt?: string;
  videoUrl?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  background?: "white" | "grey" | "green" | "purple";
  items?: PanelItem[];
};

export const PANEL_LAYOUTS: { key: string; label: string }[] = [
  { key: "text_only", label: "Text only" },
  { key: "text_image", label: "Text & image" },
  { key: "image_text", label: "Image & text" },
  { key: "text_image_split", label: "Text & image split" },
  { key: "image_text_split", label: "Image & text split" },
  { key: "video_text", label: "Video & text" },
  { key: "text_cards", label: "Text & cards" },
  { key: "feature_cards", label: "Feature cards" },
  { key: "highlight_cards", label: "Highlight cards" },
  { key: "simple_grid", label: "Simple header with grid" },
  { key: "carousel", label: "Carousel" },
];

const BG: Record<string, { wrap: string; dark: boolean }> = {
  white: { wrap: "bg-white", dark: false },
  grey: { wrap: "bg-cool-grey", dark: false },
  green: { wrap: "bg-somerset-green", dark: true },
  purple: { wrap: "bg-damson", dark: true },
};

function embedUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return null;
    if (u.hostname.endsWith("youtube.com") && u.searchParams.get("v")) return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (u.hostname === "youtu.be") return `https://www.youtube.com/embed${u.pathname}`;
    if (u.hostname.endsWith("vimeo.com")) return `https://player.vimeo.com/video${u.pathname}`;
    return null;
  } catch {
    return null;
  }
}

function Copy({ c, dark }: { c: ContentPanelConfig; dark: boolean }) {
  return (
    <div className="space-y-3">
      {c.eyebrow && (
        <p className={cn("text-[11px] font-semibold tracking-[0.18em] uppercase", dark ? "text-white/75" : "text-damson")}>{c.eyebrow}</p>
      )}
      {c.heading && <h2 className="font-serif text-3xl font-black sm:text-4xl">{c.heading}</h2>}
      {c.body &&
        c.body
          .split(/\n{2,}/)
          .filter(Boolean)
          .map((p, i) => (
            <p key={i} className={cn("leading-relaxed whitespace-pre-wrap", dark ? "text-white/90" : "text-stone-600")}>
              {p}
            </p>
          ))}
      {c.ctaLabel && c.ctaUrl && (
        <Link
          href={c.ctaUrl}
          className={cn(
            "mt-2 inline-block rounded-full px-6 py-3 text-sm font-bold transition-opacity hover:opacity-90",
            dark ? "bg-white text-deep-green" : "bg-damson text-white",
          )}
        >
          {c.ctaLabel}
        </Link>
      )}
    </div>
  );
}

function Card({ item, dark, tone }: { item: PanelItem; dark: boolean; tone?: "plain" | "highlight" }) {
  const inner = (
    <>
      {item.imageUrl !== undefined && tone !== "highlight" && (
        <Img src={item.imageUrl || null} alt={item.title ?? ""} label={item.title} className="aspect-[4/3] w-full" />
      )}
      <div className={cn("flex flex-1 flex-col gap-1.5 p-5", tone === "highlight" && "justify-between p-6")}>
        {item.title && <p className="font-serif text-xl leading-tight font-black">{item.title}</p>}
        {item.text && <p className={cn("text-sm", tone === "highlight" || dark ? "text-white/90" : "text-stone-600")}>{item.text}</p>}
        {item.url && (
          <span className="mt-2 inline-flex items-center gap-1 text-sm font-bold">
            Find out more <ArrowRight className="size-4" />
          </span>
        )}
      </div>
    </>
  );
  const cls = cn(
    "group flex flex-col overflow-hidden rounded-3xl",
    tone === "highlight" ? "bg-somerset-green text-white" : dark ? "bg-white/10" : "border border-stone-200 bg-white text-stone-900",
  );
  return item.url ? (
    <Link href={item.url} className={cn(cls, "transition-shadow hover:shadow-md")}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

// The "Content panel" family — one widget, many layouts, matching the
// "Content panel – …" widgets editors already know from Kentico.
export function ContentPanel({ config }: { config: ContentPanelConfig }) {
  const layout = config.layout || "text_only";
  const bg = BG[config.background || "white"] ?? BG.white;
  const items = config.items ?? [];
  const video = embedUrl(config.videoUrl);

  const image = (
    <Img
      src={config.imageUrl || null}
      alt={config.imageAlt ?? ""}
      label={config.heading}
      className="aspect-[4/3] w-full rounded-3xl"
    />
  );

  // Full-bleed split panels: half image, half copy.
  if (layout === "text_image_split" || layout === "image_text_split") {
    const imageFirst = layout === "image_text_split";
    return (
      <section className={cn("grid md:grid-cols-2", bg.wrap, bg.dark && "text-white")}>
        <div className={cn("flex items-center px-8 py-14 sm:px-14", imageFirst && "md:order-2")}>
          <div className="max-w-xl">
            <Copy c={config} dark={bg.dark} />
          </div>
        </div>
        <div className={cn("min-h-72", imageFirst && "md:order-1")}>
          <Img src={config.imageUrl || null} alt={config.imageAlt ?? ""} label={config.heading} className="h-full min-h-72 w-full" />
        </div>
      </section>
    );
  }

  const shell = (children: React.ReactNode) => (
    <section className={cn("px-6 py-14", bg.wrap, bg.dark && "text-white")}>
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  );

  if (layout === "text_image" || layout === "image_text") {
    const imageFirst = layout === "image_text";
    return shell(
      <div className="grid items-center gap-10 md:grid-cols-2">
        <div className={cn(imageFirst && "md:order-2")}>
          <Copy c={config} dark={bg.dark} />
        </div>
        <div className={cn(imageFirst && "md:order-1")}>{image}</div>
      </div>,
    );
  }

  if (layout === "video_text") {
    return shell(
      <div className="grid items-center gap-10 md:grid-cols-2">
        <Copy c={config} dark={bg.dark} />
        {video ? (
          <div className="aspect-video overflow-hidden rounded-3xl bg-black">
            <iframe src={video} title={config.heading || "Video"} className="h-full w-full" allow="fullscreen" loading="lazy" />
          </div>
        ) : (
          image
        )}
      </div>,
    );
  }

  if (layout === "carousel") {
    return shell(
      <div className="space-y-6">
        <div className="max-w-2xl">
          <Copy c={{ ...config, ctaLabel: undefined }} dark={bg.dark} />
        </div>
        <div className="flex snap-x gap-4 overflow-x-auto pb-3">
          {items.map((it, i) => (
            <div key={i} className="w-72 shrink-0 snap-start">
              <Card item={it} dark={bg.dark} />
            </div>
          ))}
        </div>
      </div>,
    );
  }

  if (layout === "text_cards" || layout === "feature_cards" || layout === "highlight_cards" || layout === "simple_grid") {
    const cols = layout === "simple_grid" ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
    return shell(
      <div className="space-y-8">
        <div className="max-w-2xl">
          <Copy c={config} dark={bg.dark} />
        </div>
        <div className={cn("grid gap-5", cols)}>
          {items.map((it, i) =>
            layout === "simple_grid" ? (
              <Card key={i} item={{ ...it, imageUrl: undefined }} dark={bg.dark} />
            ) : layout === "highlight_cards" ? (
              <Card key={i} item={it} dark={bg.dark} tone="highlight" />
            ) : (
              <Card key={i} item={it} dark={bg.dark} />
            ),
          )}
        </div>
      </div>,
    );
  }

  // text_only
  return shell(
    <div className="mx-auto max-w-3xl">
      <Copy c={config} dark={bg.dark} />
    </div>,
  );
}
