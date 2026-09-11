// Imports sz.itineraryday nodes (excluded from the original import-real-pages.ts
// run) as real child pages of their parent sz.itinerary page, then re-parents
// each day's already-imported "stop" pages (sz.touristitem business/attraction
// pages, e.g. hotels visited on that day) from wherever they currently sit
// onto the new day page. Additive only: creates new pages and updates only
// the parentId of already-existing pages — never deletes, never touches any
// other field, so any real edits already made to a stop page are untouched.
//
// Usage: npx tsx kentico-import/import-itinerary-days.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/import-itinerary-days.ts <path-to-extracted-export>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

// Mirrors import-real-pages.ts's helpers exactly.
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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-\/|\/-/g, "/");
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

  const days = arr(dataset, "sz.itineraryday");
  console.log(`Found ${days.length} sz.itineraryday nodes in the export.`);

  const superAdmin = await prisma.user.findFirst({ where: { role: { key: "SUPER_ADMIN" } } });
  if (!superAdmin) throw new Error("No Super Admin user found — run prisma/seed.ts first.");

  // Look up an existing imported page by its stored _kenticoNodeId.
  const allImported = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { id: true, customFields: true },
  });
  const pageIdByKenticoNodeId = new Map<string, string>();
  for (const p of allImported) {
    const nodeId = getField(parseCustomFields(p.customFields), "_kenticoNodeId");
    if (nodeId) pageIdByKenticoNodeId.set(nodeId, p.id);
  }

  let created = 0;
  let skippedExisting = 0;
  let skippedNoParent = 0;
  const dayPageIdByNodeId = new Map<string, string>();

  for (const day of days) {
    if (pageIdByKenticoNodeId.has(day.NodeID)) {
      dayPageIdByNodeId.set(day.NodeID, pageIdByKenticoNodeId.get(day.NodeID)!);
      skippedExisting++;
      continue;
    }

    const parentId = day.NodeParentID ? pageIdByKenticoNodeId.get(day.NodeParentID) : undefined;
    if (!parentId) {
      console.warn(`  Skipping day "${day.ItineraryDayTitle}" (node ${day.NodeID}) — parent itinerary not found.`);
      skippedNoParent++;
      continue;
    }

    const title = day.ItineraryDayTitle || day.DocumentName || `Day ${day.NodeOrder}`;
    const body = stripHtml(extractWebpartContent(day.DocumentContent));

    const customFields: { key: string; value: string }[] = [
      { key: "_kenticoNodeId", value: day.NodeID },
      { key: "_kenticoClassName", value: "sz.itineraryday" },
    ];

    const baseSlug = slugify((day.NodeAliasPath || day.NodeID).replace(/^\//, ""));
    let slug = baseSlug || `itinerary-day-${day.NodeID}`;
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${day.NodeID}`;

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        bodyContent: body || null,
        status: day.DocumentIsArchived === "true" ? "ARCHIVED" : "PUBLISHED",
        parentId,
        sortOrder: Number(day.NodeOrder ?? 0),
        authorId: superAdmin.id,
        ownerId: superAdmin.id,
        customFields: JSON.stringify(customFields),
      },
    });
    pageIdByKenticoNodeId.set(day.NodeID, page.id);
    dayPageIdByNodeId.set(day.NodeID, page.id);
    created++;
    console.log(`  Created day "${title}" under parent itinerary.`);
  }

  console.log(`\nCreated ${created} itinerary-day pages (${skippedExisting} already existed, ${skippedNoParent} had no importable parent).`);

  // Re-parent each day's already-imported "stop" pages onto the new day page.
  let reparented = 0;
  for (const [tagName, value] of Object.entries(dataset)) {
    const records = Array.isArray(value) ? value : [value];
    for (const r of records as Record<string, string>[]) {
      if (!r.NodeParentID || !dayPageIdByNodeId.has(r.NodeParentID)) continue;
      if (tagName === "sz.itineraryday") continue; // a day's own record, not a stop
      const stopPageId = pageIdByKenticoNodeId.get(r.NodeID);
      if (!stopPageId) continue; // this child class was never imported as a page
      const newParentId = dayPageIdByNodeId.get(r.NodeParentID)!;
      await prisma.page.update({ where: { id: stopPageId }, data: { parentId: newParentId } });
      reparented++;
    }
  }

  console.log(`Re-parented ${reparented} stop pages onto their itinerary day.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
