// Writes lib/data/facility-ids.json: Kentico facility id -> [name, group].
// Listing pages carry ItemFacilities as "1526|1797|..." (these ids), so this
// is how the site knows which facilities (accessibility, pets, parking...)
// each real listing has. Re-run against a fresher export if needed.
//
// Usage: npx tsx kentico-import/export-facility-ids.ts [path-to-extracted-export]

import fs from "fs";
import path from "path";
import { parseExportRows } from "./parse-export-xml";

const exportRoot = process.argv[2] ?? path.join(process.cwd(), "kentico-import", "raw");
const dir = path.join(exportRoot, "Data", "Customtables");

const groups = new Map<string, string>();
for (const g of parseExportRows(path.join(dir, "customtable_sz_facilitygroups.xml.export"), "sz_facilitygroups")) {
  groups.set(g.ItemID, g.FacilityGroupName);
}

const out: Record<string, [string, string]> = {};
for (const f of parseExportRows(path.join(dir, "customtable_sz_facilities.xml.export"), "sz_facilities")) {
  out[f.ItemID] = [f.FacilityName, groups.get(f.FacilityGroupID) ?? ""];
}

fs.writeFileSync(path.join(process.cwd(), "lib", "data", "facility-ids.json"), JSON.stringify(out));
console.log(`facility ids written: ${Object.keys(out).length}`);
