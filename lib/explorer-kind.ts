export type ExplorerKindName = "accommodation" | "things" | "food" | "events";

// One "Section landing" template serves every section: what a landing page
// lists (stays, things to do, food & drink, events) is worked out from where
// the page sits in the site, unless an editor has chosen it explicitly.
export function resolveExplorerKind(configured: unknown, rootSlug: string): ExplorerKindName {
  if (configured === "accommodation" || configured === "things" || configured === "food" || configured === "events") {
    return configured;
  }
  const s = rootSlug.toLowerCase();
  if (s.startsWith("places-to-stay")) return "accommodation";
  if (s.startsWith("festivals-events") || s.startsWith("festivals-and-events")) return "events";
  if (s.includes("food-drink") || s.includes("food-and-drink")) return "food";
  return "things";
}

export function defaultNoun(kind: ExplorerKindName): string {
  switch (kind) {
    case "accommodation":
      return "places to stay";
    case "events":
      return "events";
    case "food":
      return "places to eat and drink";
    default:
      return "things to do";
  }
}
