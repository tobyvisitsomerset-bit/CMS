import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const groups = await prisma.facilityGroup.findMany({ orderBy: { sortOrder: "asc" } });
  const facilities = await prisma.facility.findMany();
  const locations = await prisma.location.findMany({ orderBy: { sortOrder: "asc" } });
  const tiers = await prisma.membershipTierDefinition.findMany({ orderBy: { sortOrder: "asc" } });

  const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

  const data = {
    facilityGroups: groups.map((g) => ({ name: g.name, sortOrder: g.sortOrder })),
    facilities: facilities.map((f) => ({
      name: f.name,
      groupName: f.groupId ? groupNameById.get(f.groupId) ?? null : null,
      mapFilter: f.mapFilter,
      filterGeneral: f.filterGeneral,
      filterAccommodation: f.filterAccommodation,
    })),
    locations: locations.map((l) => ({
      name: l.name,
      latitude: l.latitude,
      longitude: l.longitude,
      radiusMiles: l.radiusMiles,
      sortOrder: l.sortOrder,
    })),
    membershipTiers: tiers.map((t) => ({
      tier: t.tier,
      name: t.name,
      priceLabel: t.priceLabel,
      searchPriorityLabel: t.searchPriorityLabel,
      sortOrder: t.sortOrder,
      features: JSON.parse(t.features),
    })),
  };

  writeFileSync("kentico-import/reference-data.json", JSON.stringify(data, null, 2));
  console.log(
    `Wrote kentico-import/reference-data.json: ${data.facilityGroups.length} groups, ${data.facilities.length} facilities, ${data.locations.length} locations, ${data.membershipTiers.length} tiers`,
  );
}

main().finally(() => prisma.$disconnect());
