// Folds sz.touristitemgrading nodes (excluded from the original
// import-real-pages.ts run) into their parent touristitem page's customFields
// — small (16 records) award/grading badges, e.g. "AA Pennants 4", each a
// child of one specific business page. No binary is recoverable for the
// badge icon itself (Media Library GUID, not present in this export) — only
// the grading name is captured. Additive only: appends to the existing
// customFields array, never overwrites, and is safe to re-run (skips a
// grading already present on its parent).
//
// Usage: npx tsx kentico-import/backfill-tourist-item-gradings.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/backfill-tourist-item-gradings.ts <path-to-extracted-export>");
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

  const gradings = arr(dataset, "sz.touristitemgrading");
  console.log(`Found ${gradings.length} sz.touristitemgrading nodes in the export.`);

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

  for (const grading of gradings) {
    const parentPageId = grading.NodeParentID ? pageIdByKenticoNodeId.get(grading.NodeParentID) : undefined;
    if (!parentPageId) {
      console.warn(`  Skipping grading "${grading.ItemGradingName}" (node ${grading.NodeID}) — parent page not found.`);
      skippedNoParent++;
      continue;
    }

    const parentPage = pageById.get(parentPageId)!;
    const fields = parseCustomFields(parentPage.customFields);
    const gradingName = grading.ItemGradingName || grading.DocumentName;
    if (!gradingName) continue;

    const alreadyPresent = fields.some((f) => f.key === "ItemGradingName" && f.value === gradingName);
    if (alreadyPresent) {
      skippedExisting++;
      continue;
    }

    fields.push({ key: "ItemGradingName", value: gradingName });
    await prisma.page.update({ where: { id: parentPageId }, data: { customFields: JSON.stringify(fields) } });
    parentPage.customFields = JSON.stringify(fields); // keep in-memory copy consistent if a page has >1 grading
    appended++;
    console.log(`  Added grading "${gradingName}" to "${parentPage.title}"`);
  }

  console.log(`\nDone. Appended ${appended} gradings. Skipped ${skippedExisting} already present, ${skippedNoParent} with no parent page.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
