import { decodeEntities } from "@/lib/kentico-item-fields";

// How a page's heading is shown, read from the same fields Kentico 11 uses on
// its "Page (menu item)" form so imported pages keep their settings:
//   MenuItemTitle           display title; words in *asterisks* use the script font
//   MenuItemSubtitle        subtitle (the page's own Subtitle box wins when filled)
//   MenuItemSubtitleScript  show the subtitle in the script font
//   MenuItemSupertitle      show the subtitle above the title
//   MenuItemSummary         short summary (search results and descriptions)
//   MenuItemNewWindow       open links to this page in a new tab
//   HeroFocus               "x,y" focus point (percent) of the banner photo

type Cf = { key: string; value: string }[];

function cf(raw: string | null): Cf {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function val(fields: Cf, key: string): string {
  return fields.find((f) => f.key === key)?.value ?? "";
}

const truthy = (v: string) => /^(true|1|yes)$/i.test(v.trim());

/** Kentico stores the title as small bits of HTML. Turns that into plain text with *script* words. */
export function titleToMarkup(value: string | null | undefined): string {
  if (!value) return "";
  return decodeEntities(
    value
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*(em|i)\b[^>]*>([\s\S]*?)<\s*\/\s*(em|i)\s*>/gi, "*$2*")
      .replace(/<\/(p|div|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

export function plainTitle(markup: string): string {
  return markup.replace(/\*/g, "").replace(/\s*\n\s*/g, " ").trim();
}

export type FocusPoint = { x: number; y: number };

export function parseFocus(value: string | null | undefined): FocusPoint | null {
  const m = (value ?? "").match(/^\s*(\d{1,3}(?:\.\d+)?)\s*,\s*(\d{1,3}(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const x = Math.min(100, Number(m[1]));
  const y = Math.min(100, Number(m[2]));
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

export function focusStyle(value: string | null | undefined): { objectPosition?: string } {
  const f = parseFocus(value);
  return f ? { objectPosition: `${f.x}% ${f.y}%` } : {};
}

export type PageDisplay = {
  /** Title text with *script* words, possibly several lines. */
  titleMarkup: string;
  subtitle: string | null;
  subtitleScript: boolean;
  subtitleAbove: boolean;
  summary: string | null;
  focus: string | null;
  newWindow: boolean;
};

export function pageDisplay(page: { title: string; subtitle: string | null; customFields: string | null }): PageDisplay {
  const f = cf(page.customFields);
  const own = titleToMarkup(val(f, "MenuItemTitle"));
  const subtitle = (page.subtitle ?? "").trim() || titleToMarkup(val(f, "MenuItemSubtitle")) || null;
  return {
    titleMarkup: own || page.title,
    subtitle,
    subtitleScript: truthy(val(f, "MenuItemSubtitleScript")),
    subtitleAbove: truthy(val(f, "MenuItemSupertitle")),
    summary: titleToMarkup(val(f, "MenuItemSummary")) || null,
    focus: val(f, "HeroFocus") || null,
    newWindow: truthy(val(f, "MenuItemNewWindow")),
  };
}
