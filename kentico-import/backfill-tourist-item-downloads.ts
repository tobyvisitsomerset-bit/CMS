// Folds sz.touristitemdownload nodes (excluded from the original
// import-real-pages.ts run) into their parent touristitem page's customFields
// — 41 records, PDF/brochure download links. The actual file binary is NOT
// recoverable (Media Library GUID, not present in this export) — only the
// download's title is captured, as a record that it existed, in case a fuller
// export or manual re-upload arrives later. Additive only: appends to the
// existing customFields array, never overwrites, safe to re-run.
//
// Usage: npx tsx kentico-import/backfill-tourist-item-downloads.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/backfill-tourist-item-downloads.ts <path-to-extracted-export>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

function parseCustomFields(json: string | null): { key: string; value: string }[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getField(fields: { key: string; value: string }[], key: string): string | null {
  return fields.find((f) => f.key === key)?.value ?? null;
}

function arr(dataset: Record<string, unknown>, tag: string): Record<string, string>[] {
  const v = dataset[tag];
  return Array.isArray(v) ? (v as Record<string, string>[]) : v ? [v as Record<string, string>] : [];
}

async function main() {
  console.log(`Reading ${DOCUMENT_XML}...`);
  const xml = readFileSync(DOCUMENT_XML, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  const parsed = parser.parse(xml);
  const dataset = parsed.cms_document.NewDataSet as Record<string, unknown>;

  const downloads = arr(dataset, "sz.touristitemdownload");
  console.log(`Found ${downloads.length} sz.touristitemdownload nodes in the export.`);

  const allImported = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { id: true, title: true, customFields: true },
  });
  const pageById = new Map(allImported.map((p) => [p.id, p]));
  const pageIdByKenticoNodeId = new Map<string, string>();
  for (const p of allImported) {
    const nodeId = getField(parseCustomFields(p.customFields), "_kenticoNodeId");
    if (nodeId) pageIdByKenticoNodeId.set(nodeId, p.id);
  }

  let appended = 0;
  let skippedExisting = 0;
  let skippedNoParent = 0;

  for (const dl of downloads) {
    const parentPageId = dl.NodeParentID ? pageIdByKenticoNodeId.get(dl.NodeParentID) : undefined;
    if (!parentPageId) {
      console.warn(`  Skipping download "${dl.ItemDownloadTitle}" (node ${dl.NodeID}) — parent page not found.`);
      skippedNoParent++;
      continue;
    }

    const parentPage = pageById.get(parentPageId)!;
    const fields = parseCustomFields(parentPage.customFields);
    const downloadTitle = dl.ItemDownloadTitle || dl.DocumentName;
    if (!downloadTitle) continue;

    const alreadyPresent = fields.some((f) => f.key === "ItemDownloadTitle" && f.value === downloadTitle);
    if (alreadyPresent) {
      skippedExisting++;
      continue;
    }

    fields.push({ key: "ItemDownloadTitle", value: downloadTitle });
    await prisma.page.update({ where: { id: parentPageId }, data: { customFields: JSON.stringify(fields) } });
    parentPage.customFields = JSON.stringify(fields);
    appended++;
    console.log(`  Added download "${downloadTitle}" to "${parentPage.title}"`);
  }

  console.log(`\nDone. Appended ${appended} downloads. Skipped ${skippedExisting} already present, ${skippedNoParent} with no parent page.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
