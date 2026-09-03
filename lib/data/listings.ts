import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { ListingCategory, MembershipTier } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- only used via `typeof` below, which is the standard Prisma.validator pattern
const listingWithFacilities = Prisma.validator<Prisma.ListingDefaultArgs>()({
  include: { facilities: true },
});
export type ListingWithFacilities = Prisma.ListingGetPayload<typeof listingWithFacilities>;

const TIER_RANK: Record<MembershipTier, number> = {
  PLATINUM: 0,
  GOLD: 1,
  SILVER: 2,
  BRONZE: 3,
};

function byTierThenSortOrder(a: ListingWithFacilities, b: ListingWithFacilities): number {
  const rankA = a.membershipTier ? TIER_RANK[a.membershipTier] : TIER_RANK.BRONZE + 1;
  const rankB = b.membershipTier ? TIER_RANK[b.membershipTier] : TIER_RANK.BRONZE + 1;
  if (rankA !== rankB) return rankA - rankB;
  return a.sortOrder - b.sortOrder;
}

export async function getListingsByCategory(category: ListingCategory, take = 30) {
  const rows = await prisma.listing.findMany({ where: { category }, include: { facilities: true }, take });
  return category === "EVENT" ? rows.sort((a, b) => (a.startDate?.getTime() ?? 0) - (b.startDate?.getTime() ?? 0)) : rows.sort(byTierThenSortOrder);
}

export async function getUpcomingEvents(take = 30) {
  return prisma.listing.findMany({
    where: { category: "EVENT" },
    include: { facilities: true },
    orderBy: { startDate: "asc" },
    take,
  });
}

export async function getAllListingsGrouped() {
  const all = await prisma.listing.findMany({ include: { facilities: true } });
  const grouped: Record<ListingCategory, ListingWithFacilities[]> = {
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
