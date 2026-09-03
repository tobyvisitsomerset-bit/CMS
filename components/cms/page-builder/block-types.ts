import {
  LayoutTemplate,
  Type,
  Images,
  LayoutGrid,
  Video,
  ChevronDown,
  Quote,
  HelpCircle,
  Megaphone,
  Map as MapIcon,
  Search,
  CalendarDays,
} from "lucide-react";

export type BlockType =
  | "hero"
  | "text"
  | "gallery"
  | "cards"
  | "video"
  | "accordion"
  | "testimonials"
  | "faq"
  | "cta_banner"
  | "map"
  | "listing_search"
  | "listing_grid"
  | "event_calendar";

export const BLOCK_DEFS: { type: BlockType; label: string; description: string; icon: typeof LayoutTemplate }[] = [
  { type: "hero", label: "Hero", description: "Full-width banner with heading and CTA", icon: LayoutTemplate },
  { type: "text", label: "Text Block", description: "Heading and body copy", icon: Type },
  { type: "gallery", label: "Gallery", description: "Grid of images", icon: Images },
  { type: "cards", label: "Cards", description: "Repeatable feature or listing cards", icon: LayoutGrid },
  { type: "video", label: "Video", description: "Embedded video", icon: Video },
  { type: "accordion", label: "Accordion", description: "Expandable question/answer items", icon: ChevronDown },
  { type: "testimonials", label: "Testimonials", description: "Customer quotes", icon: Quote },
  { type: "faq", label: "FAQ", description: "Frequently asked questions", icon: HelpCircle },
  { type: "cta_banner", label: "CTA Banner", description: "Call-to-action strip", icon: Megaphone },
  { type: "map", label: "Map", description: "Location map placeholder", icon: MapIcon },
  { type: "listing_search", label: "Listing Search Bar", description: "Search + filter pills for a listing page", icon: Search },
  { type: "listing_grid", label: "Listing Grid & Map", description: "Cards + map for a category of listings", icon: LayoutGrid },
  { type: "event_calendar", label: "Event Calendar", description: "Events list with a calendar sidebar", icon: CalendarDays },
];

export function blockLabel(type: string): string {
  return BLOCK_DEFS.find((b) => b.type === type)?.label ?? type;
}

export function defaultConfigFor(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { heading: "New hero heading", subheading: "", imageUrl: "", ctaLabel: "", ctaUrl: "" };
    case "text":
      return { heading: "", body: "" };
    case "gallery":
      return { imageUrls: [] };
    case "cards":
      return { heading: "", columns: 3, items: [] };
    case "video":
      return { heading: "", videoUrl: "" };
    case "accordion":
    case "faq":
      return { heading: "", items: [] };
    case "testimonials":
      return { heading: "", items: [] };
    case "cta_banner":
      return { heading: "", subtext: "", buttonLabel: "", buttonUrl: "", style: "dark" };
    case "map":
      return { heading: "", locationLabel: "" };
    case "listing_search":
      return { title: "", subtitle: "", filters: [], showSearchBar: true };
    case "listing_grid":
      return { category: "ACCOMMODATION", heading: "", showMap: true };
    case "event_calendar":
      return { heading: "" };
    default:
      return {};
  }
}
