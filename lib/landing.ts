import { hasBusinessFields } from "@/lib/listing-marker";

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

export type PageFormKind = "home" | "explorer" | "listing" | "page";

/**
 * Which Form tab a page gets: member listings keep the listing form (address,
 * contact, rooms...); everything else - the home page, section landings and
 * ordinary pages - gets the page (menu item) form.
 */
export function formKindFor(page: {
  contentBlocks: Block[];
  customFields: string | null;
  membershipTier: unknown;
  assignedMemberId: string | null;
  rooms: unknown[];
}): { kind: PageFormKind; block: Block | null } {
  const landing = landingFor(page);
  if (landing) return { kind: landing.kind, block: landing.block };
  const cls = (page.customFields ?? "").match(/"key":"_kenticoClassName","value":"([^"]+)"/)?.[1];
  if (cls === "sz.touristitem" || page.membershipTier || page.assignedMemberId || page.rooms.length > 0 || hasBusinessFields(page.customFields)) {
    return { kind: "listing", block: null };
  }
  return { kind: "page", block: null };
}
