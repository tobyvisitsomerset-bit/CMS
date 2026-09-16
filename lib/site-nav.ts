// Only the real, currently-PUBLISHED top-level sections — the tree also has
// ~33 stray unmerged Kentico root nodes (Zesty, Extranet, etc.) that aren't
// real navigation and a "Experiences" hub that's still DRAFT. Hardcoded
// rather than derived from the tree until that cleanup happens. Shared by
// the site header and the interactive map's category filter, since a real
// page's top-level slug segment (e.g. "places-to-stay/hotels/...") lines up
// with these same slugs.
export const NAV_LINKS = [
  { label: "Places To Stay", slug: "places-to-stay" },
  { label: "Things To Do", slug: "things-to-do" },
  { label: "Food & Drink", slug: "food-and-drink" },
  { label: "Festivals & Events", slug: "festivals-and-events" },
  { label: "Somerset Stories", slug: "somerset-stories" },
  { label: "Map", slug: "interactive-map" },
  { label: "My Trip", slug: "my-trip" },
];

export function labelForSlugSegment(segment: string): string {
  return NAV_LINKS.find((link) => link.slug === segment)?.label ?? segment;
}
