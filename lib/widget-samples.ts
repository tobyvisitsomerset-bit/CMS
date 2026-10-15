import { defaultConfigFor, type BlockType } from "@/components/cms/page-builder/block-types";

// Example content used to draw each widget in the Widgets application, so
// the preview looks like a real page section rather than an empty shell.
const CARDS = [
  { title: "Cheddar Gorge & Caves", text: "England's deepest gorge and the caves beneath it.", imageUrl: "", url: "/things-to-do" },
  { title: "Wells Cathedral", text: "A Gothic masterpiece in England's smallest city.", imageUrl: "", url: "/things-to-do" },
  { title: "Glastonbury Tor", text: "Climb the legend for views across the Levels.", imageUrl: "", url: "/things-to-do" },
];

const PANEL_BASE = {
  eyebrow: "Plan your trip",
  heading: "A weekend in the Mendips",
  body:
    "Caves and gorges by day, cider and cheese by evening. Somerset packs a great deal into a small space — here is where to start.\n\nStay somewhere with a view, then spend two days exploring.",
  imageUrl: "",
  imageAlt: "",
  ctaLabel: "Find out more",
  ctaUrl: "/discover-somerset",
  background: "white",
  items: CARDS,
};

export const PANEL_PREVIEW_LAYOUTS = [
  "text_only",
  "text_image",
  "image_text",
  "text_image_split",
  "image_text_split",
  "video_text",
  "text_cards",
  "feature_cards",
  "highlight_cards",
  "simple_grid",
  "carousel",
  "text_image_carousel",
  "image_text_carousel",
  "text_image_grid",
  "all_options",
];

export function sampleConfig(type: BlockType, layout?: string): Record<string, unknown> {
  const base = defaultConfigFor(type);
  switch (type) {
    case "hero":
      return { ...base, eyebrow: "Somerset · England's West Country", heading: "Be enchanted", subheading: "Cheddar and cider, Glastonbury and Georgian Bath — all within an hour of each other.", ctaLabel: "", showSearchBar: false };
    case "text":
      return { ...base, heading: "About this place", body: "A short introduction to the area, written by the editor. Use a blank line between paragraphs." };
    case "gallery":
      return { ...base, imageUrls: ["", "", "", ""] };
    case "cards":
      return { ...base, heading: "Don't miss", columns: 3, items: CARDS.map((c) => ({ title: c.title, description: c.text, imageUrl: "" })) };
    case "accordion":
    case "faq":
      return {
        ...base,
        heading: "Good to know",
        items: [
          { question: "Is there parking?", answer: "Yes — a pay-and-display car park is a two-minute walk away." },
          { question: "Are dogs welcome?", answer: "Well-behaved dogs are welcome on a lead." },
        ],
      };
    case "testimonials":
      return { ...base, heading: "Visitors say", items: [{ quote: "A perfect weekend away.", author: "A visitor", rating: 5 }, { quote: "Lovely staff, lovely views.", author: "A guest", rating: 5 }] };
    case "cta_banner":
      return { ...base, heading: "See it all on the map", subtext: "Every place we know about, on one live map.", buttonLabel: "Open the map", buttonUrl: "/interactive-map" };
    case "map":
      return { ...base, heading: "Where to find us", locationLabel: "Wells, Somerset" };
    case "content_panel":
      return { ...base, ...PANEL_BASE, layout: layout ?? "text_image" };
    case "spotlight":
      return { ...base, eyebrow: "Now on", heading: "Illuminated carnival season", text: "Europe's largest illuminated processions run every autumn.", ctaLabel: "See the dates", ctaUrl: "/festivals-events" };
    case "button":
      return { ...base, label: "Book experiences", url: "/book-experiences", style: "purple", align: "left" };
    case "ad_bar":
      return { ...base, alt: "Sponsor banner", label: "Advertisement" };
    case "page_cards":
      return { ...base, slugs: ["bath", "taunton"] };
    case "social_panel":
      return { ...base, images: ["", "", "", "", "", ""].map(() => ({ imageUrl: "", url: "" })) };
    case "embed":
      return { ...base, heading: "Plan your journey", url: "https://www.traveline.info/", height: 260 };
    default:
      return base;
  }
}

// Widgets that are expensive to draw dozens of times on the list page.
export const HEAVY_PREVIEW: BlockType[] = ["producer_shop", "buy_panel", "listing_explorer", "experiences_hub", "map_band", "embed", "social_panel"];
