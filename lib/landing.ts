type Block = { id: string; type: string; config: string | null };

export type LandingKind = "home" | "explorer";

function parse(config: string | null): Record<string, unknown> {
  try {
    return JSON.parse(config || "{}");
  } catch {
    return {};
  }
}

/**
 * Landing pages (the home page and every section landing) are not member
 * businesses: they have no address, contact details or rooms, and they are
 * never themselves listed in an explorer.
 */
export function landingFor(page: { contentBlocks: Block[] }): { kind: LandingKind; block: Block } | null {
  const hero = page.contentBlocks.find((b) => b.type === "hero" && parse(b.config).showSearchBar === true);
  if (hero) return { kind: "home", block: hero };
  const explorer = page.contentBlocks.find((b) => b.type === "listing_explorer");
  if (explorer) return { kind: "explorer", block: explorer };
  return null;
}
