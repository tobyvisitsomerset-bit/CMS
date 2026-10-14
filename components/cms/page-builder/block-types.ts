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
  LayoutPanelTop,
  Rows3,
  Building2,
  Ticket,
  Smile,
  ListFilter,
  ShoppingBag,
  Compass,
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
  | "event_calendar"
  | "explore_area_tiles"
  | "real_teaser"
  | "towns_row"
  | "book_strip"
  | "mood_tiles"
  | "listing_explorer"
  | "producer_shop"
  | "experiences_hub";

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
  { type: "explore_area_tiles", label: "Explore Area Tiles", description: "Real-count tiles linking to site sections", icon: LayoutPanelTop },
  { type: "real_teaser", label: "Real Content Teaser", description: "A few real businesses or events, with a \"See all\" link", icon: Rows3 },
  { type: "towns_row", label: "Towns Row", description: "Tile row linking to real town pages", icon: Building2 },
  { type: "book_strip", label: "Book Strip", description: "Ready to book? strip of call-to-action buttons", icon: Ticket },
  { type: "mood_tiles", label: "Mood Tiles", description: "Circular tiles, each a real keyword search with a live place count", icon: Smile },
  { type: "listing_explorer", label: "Listing Explorer", description: "Searchable, filterable list of real businesses or events with a map", icon: ListFilter },
  { type: "producer_shop", label: "Producer Shop", description: "One block per real producer with their live products and Buy Now links", icon: ShoppingBag },
  { type: "experiences_hub", label: "Experiences Hub", description: "Book-direct experiences landing section with search and live listings", icon: Compass },
];

export function blockLabel(type: string): string {
  return BLOCK_DEFS.find((b) => b.type === type)?.label ?? type;
}

export function defaultConfigFor(type: BlockType): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { heading: "New hero heading", subheading: "", imageUrl: "", ctaLabel: "", ctaUrl: "", showSearchBar: false, eyebrow: "" };
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
      return { category: "ACCOMMODATION", heading: "" };
    case "event_calendar":
      return { heading: "" };
    case "explore_area_tiles":
      return {
        areas: [
          { label: "Places To Stay", rootSlug: "places-to-stay", href: "/places-to-stay", noun: "places to stay" },
          { label: "Things To Do", rootSlug: "things-to-do", href: "/things-to-do", noun: "things to do" },
          { label: "Food & Drink", rootSlug: "things-to-do/food-drink-more", href: "/things-to-do/food-drink-more", noun: "places to eat & drink" },
          { label: "Festivals & Events", rootSlug: "festivals-events", href: "/festivals-events", noun: "upcoming events" },
          { label: "Discover Somerset", rootSlug: "discover-somerset", href: "/discover-somerset", noun: "pages of inspiration" },
          { label: "City of Bath", rootSlug: "bath", href: "/bath", noun: "pages about Bath" },
          { label: "Taunton", rootSlug: "taunton", href: "/taunton", noun: "pages about Taunton" },
        ],
      };
    case "real_teaser":
      return { title: "On this week", mode: "events", rootSlug: "festivals-events", limit: 4, seeAllHref: "/festivals-events" };
    case "book_strip":
      return {
        heading: "Ready to book?",
        buttons: [
          { label: "Book experiences", url: "/book-experiences" },
          { label: "Book accommodation", url: "/places-to-stay" },
        ],
      };
    case "mood_tiles":
      return {
        eyebrow: "Where to start",
        title: "Somerset by mood",
        subtitle: "Six ways in, each one a search of real places.",
        moods: [
          { label: "Coast & piers", query: "coast" },
          { label: "Caves & gorges", query: "cave" },
          { label: "Cider & cheese", query: "cider" },
          { label: "Legends & heritage", query: "legend" },
          { label: "Exmoor & the hills", query: "exmoor" },
          { label: "Family days out", query: "family" },
        ],
      };
    case "listing_explorer":
      return { kind: "accommodation", rootSlug: "places-to-stay", title: "", intro: "", noun: "places to stay", parentLabel: "", parentHref: "" };
    case "producer_shop":
      return { rootSlug: "virtual-highstreet", intro: "" };
    case "experiences_hub":
      return { heading: "Book experiences", intro: "" };
    case "towns_row":
      return {
        title: "Towns & cities",
        towns: [
          { title: "City of Bath", slug: "discover-somerset/popular-somerset-towns/bath" },
          { title: "Wells", slug: "discover-somerset/popular-somerset-towns/visiting-wells-in-somerset" },
          { title: "Glastonbury", slug: "discover-somerset/popular-somerset-towns/glastonbury" },
          { title: "Weston-super-Mare", slug: "discover-somerset/popular-somerset-towns/visiting-weston-super-mare" },
          { title: "Taunton", slug: "taunton" },
        ],
      };
    default:
      return {};
  }
}
