// One-off importer for reference data pulled from a Kentico site export
// (facilities, facility groups, locations, membership tiers). Re-runnable —
// upserts everything, so it's safe to run again against a fresher export.
//
// Usage: npx tsx kentico-import/import-reference-data.ts [path-to-extracted-export]
// Defaults to ./kentico-import/raw (gitignored — extract the export zip there first).

import path from "path";
import { PrismaClient, type MembershipTier } from "@prisma/client";
import { parseExportRows } from "./parse-export-xml";

const prisma = new PrismaClient();

const exportRoot = process.argv[2] ?? path.join(process.cwd(), "kentico-import", "raw");
const customTablesDir = path.join(exportRoot, "Data", "Customtables");

function toBool(value: string | undefined): boolean {
  return value?.toLowerCase() === "true";
}

async function importFacilityGroups() {
  const rows = parseExportRows(path.join(customTablesDir, "customtable_sz_facilitygroups.xml.export"), "sz_facilitygroups");
  const idByKenticoId = new Map<string, string>();

  for (const row of rows) {
    const group = await prisma.facilityGroup.upsert({
      where: { name: row.FacilityGroupName },
      update: {},
      create: { name: row.FacilityGroupName, sortOrder: Number(row.ItemID) || 0 },
    });
    idByKenticoId.set(row.ItemID, group.id);
  }
  console.log(`Facility groups: ${rows.length} imported`);
  return idByKenticoId;
}

async function importFacilities(groupIdByKenticoId: Map<string, string>) {
  const rows = parseExportRows(path.join(customTablesDir, "customtable_sz_facilities.xml.export"), "sz_facilities");

  let count = 0;
  for (const row of rows) {
    const groupId = row.FacilityGroupID ? groupIdByKenticoId.get(row.FacilityGroupID) : undefined;
    const existing = await prisma.facility.findFirst({ where: { name: row.FacilityName, groupId: groupId ?? null } });
    if (existing) {
      await prisma.facility.update({
        where: { id: existing.id },
        data: {
          mapFilter: toBool(row.FacilityMapFilter),
          filterGeneral: toBool(row.FacilityFilterGeneral),
          filterAccommodation: toBool(row.FacilityFilterAccommodation),
        },
      });
    } else {
      await prisma.facility.create({
        data: {
          name: row.FacilityName,
          groupId: groupId ?? null,
          mapFilter: toBool(row.FacilityMapFilter),
          filterGeneral: toBool(row.FacilityFilterGeneral),
          filterAccommodation: toBool(row.FacilityFilterAccommodation),
        },
      });
    }
    count++;
  }
  console.log(`Facilities: ${count} imported`);
}

async function importLocations() {
  const rows = parseExportRows(path.join(customTablesDir, "customtable_sz_location.xml.export"), "sz_location");

  for (const row of rows) {
    await prisma.location.upsert({
      where: { name: row.LocationName },
      update: {
        latitude: Number(row.LocationLatitude),
        longitude: Number(row.LocationLongitude),
        radiusMiles: row.LocationRadius ? Number(row.LocationRadius) : null,
      },
      create: {
        name: row.LocationName,
        latitude: Number(row.LocationLatitude),
        longitude: Number(row.LocationLongitude),
        radiusMiles: row.LocationRadius ? Number(row.LocationRadius) : null,
        sortOrder: Number(row.ItemOrder) || 0,
      },
    });
  }
  console.log(`Locations: ${rows.length} imported`);
}

const TIER_BY_NAME: Record<string, MembershipTier> = {
  Bronze: "BRONZE",
  Silver: "SILVER",
  Gold: "GOLD",
  Platinum: "PLATINUM",
};

async function importMembershipTiers() {
  const rows = parseExportRows(path.join(customTablesDir, "customtable_sz_membership.xml.export"), "sz_membership");

  for (const row of rows) {
    const tier = TIER_BY_NAME[row.MembershipName];
    if (!tier) continue;

    const features = Object.fromEntries(
      Object.entries(row)
        .filter(([key]) => key.startsWith("MembershipOption"))
        .map(([key, value]) => [key.replace("MembershipOption", ""), value === "true" || value === "false" ? value === "true" : value]),
    );

    await prisma.membershipTierDefinition.upsert({
      where: { tier },
      update: {
        name: row.MembershipName,
        priceLabel: row.MembershipPrice,
        searchPriorityLabel: row.MembershipOptionSearchPriority,
        features: JSON.stringify(features),
      },
      create: {
        tier,
        name: row.MembershipName,
        priceLabel: row.MembershipPrice,
        searchPriorityLabel: row.MembershipOptionSearchPriority,
        sortOrder: Number(row.ItemOrder) || 0,
        features: JSON.stringify(features),
      },
    });
  }
  console.log(`Membership tiers: ${rows.length} imported`);
}

async function main() {
  console.log(`Importing reference data from ${exportRoot}...`);
  const groupIdByKenticoId = await importFacilityGroups();
  await importFacilities(groupIdByKenticoId);
  await importLocations();
  await importMembershipTiers();
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
