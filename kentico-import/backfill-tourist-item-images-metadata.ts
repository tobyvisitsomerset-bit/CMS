// Folds sz.touristitemimage nodes (excluded from the original
// import-real-pages.ts run) into their parent touristitem page's customFields
// — 2,581 records, additional per-item gallery images beyond the hero image.
// The actual binary is NOT recoverable (Media Library GUID, not present in
// this export) — only the image's name is captured, as a record that it
// existed, in case a fuller export arrives later. Additive only: appends to
// the existing customFields array, never overwrites, safe to re-run.
//
// Usage: npx tsx kentico-import/backfill-tourist-item-images-metadata.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/backfill-tourist-item-images-metadata.ts <path-to-extracted-export>");
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

  const images = arr(dataset, "sz.touristitemimage");
  console.log(`Found ${images.length} sz.touristitemimage nodes in the export.`);

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
  let processed = 0;

  for (const img of images) {
    processed++;
    if (processed % 500 === 0) console.log(`  ...${processed} processed`);

    const parentPageId = img.NodeParentID ? pageIdByKenticoNodeId.get(img.NodeParentID) : undefined;
    if (!parentPageId) {
      skippedNoParent++;
      continue;
    }

    const parentPage = pageById.get(parentPageId)!;
    const fields = parseCustomFields(parentPage.customFields);
    const imageName = img.ItemImageName || img.DocumentName;
    if (!imageName) continue;

    const alreadyPresent = fields.some((f) => f.key === "ItemImageName" && f.value === imageName);
    if (alreadyPresent) {
      skippedExisting++;
      continue;
    }

    fields.push({ key: "ItemImageName", value: imageName });
    await prisma.page.update({ where: { id: parentPageId }, data: { customFields: JSON.stringify(fields) } });
    parentPage.customFields = JSON.stringify(fields);
    appended++;
  }

  console.log(`\nDone. Appended ${appended} image-name records. Skipped ${skippedExisting} already present, ${skippedNoParent} with no parent page.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
