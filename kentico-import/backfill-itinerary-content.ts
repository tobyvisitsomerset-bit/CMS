// Backfills real narrative content onto already-imported sz.itinerary pages.
// import-real-pages.ts originally mapped an itinerary's body from
// ItineraryDescription, but that field is empty in the real Kentico data —
// the actual write-up lives in DocumentContent (a webpart/CDATA zone) which
// the importer never read. This is additive-only: it only touches pages
// whose bodyContent is currently empty AND have never been edited since
// creation (updatedAt === createdAt), so a real edit is never clobbered.
//
// Usage: npx tsx kentico-import/backfill-itinerary-content.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/backfill-itinerary-content.ts <path-to-extracted-export>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

// Mirrors import-real-pages.ts's stripHtml/extractWebpartContent exactly.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractWebpartContent(documentContent: string | undefined): string {
  if (!documentContent) return "";
  const matches = [...documentContent.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)];
  return matches.map((m) => m[1]).join("\n\n");
}

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

async function main() {
  console.log(`Reading ${DOCUMENT_XML}...`);
  const xml = readFileSync(DOCUMENT_XML, "utf-8");
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  const parsed = parser.parse(xml);
  const dataset = parsed.cms_document.NewDataSet;

  const rawItineraries = dataset["sz.itinerary"];
  const itineraries: Record<string, string>[] = Array.isArray(rawItineraries) ? rawItineraries : rawItineraries ? [rawItineraries] : [];
  const documentContentByNodeId = new Map<string, string>();
  for (const it of itineraries) {
    if (it.NodeID) documentContentByNodeId.set(it.NodeID, it.DocumentContent ?? "");
  }
  console.log(`Found ${documentContentByNodeId.size} sz.itinerary nodes in the export.`);

  const candidates = await prisma.page.findMany({
    where: {
      customFields: { contains: "_kenticoNodeId" },
      OR: [{ bodyContent: null }, { bodyContent: "" }],
    },
  });

  let updated = 0;
  let skippedEdited = 0;
  let skippedNoContent = 0;

  for (const page of candidates) {
    const fields = parseCustomFields(page.customFields);
    if (getField(fields, "_kenticoClassName") !== "sz.itinerary") continue;

    if (page.updatedAt.getTime() !== page.createdAt.getTime()) {
      console.warn(`  Skipping "${page.title}" — already edited since import, leaving as-is.`);
      skippedEdited++;
      continue;
    }

    const nodeId = getField(fields, "_kenticoNodeId");
    const raw = nodeId ? documentContentByNodeId.get(nodeId) : undefined;
    const body = raw ? stripHtml(extractWebpartContent(raw)) : "";
    if (!body) {
      skippedNoContent++;
      continue;
    }

    await prisma.page.update({ where: { id: page.id }, data: { bodyContent: body } });
    updated++;
    console.log(`  Updated "${page.title}" (${body.length} chars)`);
  }

  console.log(`\nDone. Updated ${updated} itinerary pages. Skipped ${skippedEdited} already-edited, ${skippedNoContent} with no recoverable content.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
