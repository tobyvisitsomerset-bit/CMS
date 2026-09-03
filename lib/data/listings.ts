import { prisma } from "@/lib/prisma";
import type { Listing, ListingCategory, MembershipTier } from "@prisma/client";

const TIER_RANK: Record<MembershipTier, number> = {
  PLATINUM: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

function byTierThenSortOrder(a: Listing, b: Listing): number {
  const rankA = a.membershipTier ? TIER_RANK[a.membershipTier] : TIER_RANK.BRONZE + 1;
  const rankB = b.membershipTier ? TIER_RANK[b.membershipTier] : TIER_RANK.BRONZE + 1;
  if (rankA !== rankB) return rankA - rankB;
  return a.sortOrder - b.sortOrder;
}

export async function getListingsByCategory(category: ListingCategory, take = 30) {
  const rows = await prisma.listing.findMany({ where: { category }, take });
  return category === "EVENT" ? rows.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0)) : rows.sort(byTierThenSortOrder);
}

export async function getUpcomingEvents(take = 30) {
  return prisma.listing.findMany({
    where: { category: "EVENT" },
    orderBy: { startDate: "asc" },
    take,
  });
}

export async function getAllListingsGrouped() {
  const all = await prisma.listing.findMany();
  const grouped: Record<ListingCategory, Listing[]> = {
    ACCOMMODATION: [],
    FOOD_DRINK: [],
    ATTRACTION: [],
    EVENT: [],
  };
  for (const listing of all) grouped[listing.category].push(listing);
  grouped.ACCOMMODATION.sort(byTierThenSortOrder);
  grouped.FOOD_DRINK.sort(byTierThenSortOrder);
  grouped.ATTRACTION.sort(byTierThenSortOrder);
  grouped.EVENT.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0));
  return grouped;
}
