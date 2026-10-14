// Only the real, currently-PUBLISHED top-level sections — the tree also has
// ~33 stray unmerged Kentico root nodes (Zesty, Extranet, etc.) that aren't
// real navigation and a "Experiences" hub that's still DRAFT. Hardcoded
// rather than derived from the tree until that cleanup happens. Shared by
// the site header and the interactive map's category filter, since a real
// page's top-level slug segment (e.g. "places-to-stay/hotels/...") lines up
// with these same slugs.
//
// Discover Somerset / Bath / Taunton added for the Phase 7 mockup-pack pass —
// confirmed real, large root sections (2,148 / 443 / 386 real published
// pages respectively) that were previously reachable by URL but linked from
// nowhere. Not added: Book Experiences (paused, needs a real payment
// decision), Business/Media/News/Favourites (no confirmed real content).
//
// Phase 8: Food & Drink and Festivals & Events repointed away from their
// former hub roots (now-archived, always empty — just the Phase 1/2 demo
// grid) to the real branches direct investigation found: 197 real
// restaurants/pubs/cafés/etc. live nested at things-to-do/food-drink-more,
// and 403 real festivals/events live at a differently-spelled duplicate root
// "festivals-events" (no "and") that was never wired into nav.
export const NAV_LINKS = [
  { label: "Places To Stay", slug: "places-to-stay" },
  { label: "Things To Do", slug: "things-to-do" },
  { label: "Food & Drink", slug: "things-to-do/food-drink-more" },
  { label: "Festivals & Events", slug: "festivals-events" },
  { label: "Somerset Stories", slug: "somerset-stories" },
  { label: "Discover Somerset", slug: "discover-somerset" },
  { label: "Bath", slug: "bath" },
  { label: "Taunton", slug: "taunton" },
  { label: "Map", slug: "interactive-map" },
  { label: "My Trip", slug: "my-trip" },
];

// Phase 12 header chrome (mockup pack screen 01): a green utility strip over
// a white main row. Every target is a real route or a real published page
// (confirmed in the page tree) — nothing here is a placeholder.
export const MAIN_NAV = [
  { label: "Book Experiences", slug: "book-experiences" },
  { label: "Discover Somerset", slug: "discover-somerset" },
  { label: "Things to do", slug: "things-to-do" },
  { label: "Places to Stay", slug: "places-to-stay" },
  { label: "Festivals & Events", slug: "festivals-events" },
];

export const MAP_NAV = { label: "Map", slug: "interactive-map" };

export const UTILITY_NAV = [
  { label: "Business", slug: "business" },
  { label: "Bath", slug: "bath" },
  { label: "Taunton", slug: "taunton" },
  { label: "Media", slug: "media" },
  { label: "News", slug: "news" },
];

export function labelForSlugSegment(segment: string): string {
  return NAV_LINKS.find((link) => link.slug === segment)?.label ?? segment;
}
