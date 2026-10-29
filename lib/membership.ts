// Membership levels. Visit Somerset now sells three: Growth, Partner and
// Premium (listing priority 3rd / 2nd / 1st). The database enum still carries
// the four Kentico-era values (Bronze to Platinum) so existing rows are never
// rewritten behind anyone's back; they are read through this file, which maps
// them onto the three current levels:
//   Bronze -> Growth, Silver -> Partner, Gold and Platinum -> Premium.
// Saving a page's membership in the editor writes the new value.

export type Level = "GROWTH" | "PARTNER" | "PREMIUM";

/** Every stored enum value, including legacy ones, that belongs to each level. */
export const LEVEL_VALUES: Record<Level, string[]> = {
  PREMIUM: ["PREMIUM", "PLATINUM", "GOLD"],
  PARTNER: ["PARTNER", "SILVER"],
  GROWTH: ["GROWTH", "BRONZE"],
};

export const LEVEL_LABEL: Record<Level, string> = {
  PREMIUM: "Premium",
  PARTNER: "Partner",
  GROWTH: "Growth",
};

/** 3 = first in search results. */
export const LEVEL_PRIORITY: Record<Level, number> = { PREMIUM: 3, PARTNER: 2, GROWTH: 1 };

/** Highest first, for iterating. */
export const LEVELS_BY_PRIORITY: Level[] = ["PREMIUM", "PARTNER", "GROWTH"];

export function toLevel(tier: string | null | undefined): Level | null {
  if (!tier) return null;
  for (const level of LEVELS_BY_PRIORITY) if (LEVEL_VALUES[level].includes(tier)) return level;
  return null;
}

/** 0 for a non-member, up to 3 for Premium. */
export function priorityOf(tier: string | null | undefined): number {
  const l = toLevel(tier);
  return l ? LEVEL_PRIORITY[l] : 0;
}

/**
 * Fair rotation inside a membership level. The level always decides first
 * (Premium, then Partner, then Growth); within a level the order is shuffled
 * once a day, the same for everyone that day, so every member in the level
 * takes a turn at the top rather than the same few always leading.
 */
export function dailyRank(id: string, day: string): number {
  let h = 2166136261;
  const text = `${day}:${id}`;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Only Premium members get the pinned "Featured member" placement. */
export function isFeatured(tier: string | null | undefined): boolean {
  return toLevel(tier) === "PREMIUM";
}

export function levelLabel(tier: string | null | undefined): string | null {
  const l = toLevel(tier);
  return l ? LEVEL_LABEL[l] : null;
}
