import type { MasterSettings } from "@/lib/data/site-settings";

// The "Menu group" box on a page form (as in Kentico). The site's menus are
// the lists on the Master page tab; this moves a page in or out of them.
export type MenuGroup = "none" | "main" | "top" | "footer";

export const MENU_GROUPS: { value: MenuGroup; label: string }[] = [
  { value: "none", label: "(none)" },
  { value: "main", label: "Main menu" },
  { value: "top", label: "Top menu (small links above the main menu)" },
  { value: "footer", label: "Footer links (terms, cookies...)" },
];

export const MAX_MAIN_NAV = 8;

const slugOf = (href: string) => href.replace(/^\/+|\/+$/g, "");

export function menuGroupFor(master: MasterSettings, slug: string): { group: MenuGroup; newTab: boolean } {
  const main = master.mainNav.find((n) => n.slug === slug);
  if (main) return { group: "main", newTab: !!main.newTab };
  const top = master.utilityLinks.find((l) => slugOf(l.href) === slug);
  if (top) return { group: "top", newTab: !!top.newTab };
  const foot = master.legalLinks.find((l) => slugOf(l.href) === slug);
  if (foot) return { group: "footer", newTab: !!foot.newTab };
  return { group: "none", newTab: false };
}

/** Puts the page in exactly one menu group (or none). New entries go at the end; order is set on the Master page tab. */
export function withPageInMenu(
  master: MasterSettings,
  page: { slug: string; label: string },
  group: MenuGroup,
  newTab: boolean,
): MasterSettings {
  const keepOthers = <T extends { href: string }>(list: T[]) => list.filter((l) => slugOf(l.href) !== page.slug);
  const next: MasterSettings = {
    ...master,
    mainNav: master.mainNav.filter((n) => n.slug !== page.slug),
    utilityLinks: keepOthers(master.utilityLinks),
    legalLinks: keepOthers(master.legalLinks),
  };
  const flag = newTab ? { newTab: true } : {};
  if (group === "main") {
    if (next.mainNav.length >= MAX_MAIN_NAV) throw new Error(`The main menu can hold ${MAX_MAIN_NAV} links. Remove one first (Master page tab).`);
    next.mainNav = [...next.mainNav, { label: page.label, slug: page.slug, ...flag }];
  } else if (group === "top") {
    next.utilityLinks = [...next.utilityLinks, { label: page.label, href: `/${page.slug}`, ...flag }];
  } else if (group === "footer") {
    next.legalLinks = [...next.legalLinks, { label: page.label, href: `/${page.slug}`, ...flag }];
  }
  return next;
}
