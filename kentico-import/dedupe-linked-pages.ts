// Kentico's own export already records which tree nodes are "linked
// documents" — the same underlying page placed in multiple categories
// without duplicating its content — via NodeLinkedNodeID. Our import
// originally treated every NodeID as a standalone Page, which is why
// businesses like Mendip Basecamp ended up with ~10 identical copies
// scattered across the tree.
//
// This uses that same NodeLinkedNodeID data to turn every duplicate back
// into a lightweight link pointing at one canonical page, matching how
// Kentico itself modelled it: one parent page, linked into other locations.
//
// Usage: npx tsx kentico-import/dedupe-linked-pages.ts <export-dir>

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/dedupe-linked-pages.ts <export-dir>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

async function main() {
  console.log("Parsing cms_document.xml.export for NodeID -> NodeLinkedNodeID...");
  const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  const xml = readFileSync(DOCUMENT_XML, "utf-8");
  const parsed = parser.parse(xml);
  const dataset = parsed.cms_document.NewDataSet;

  const linkedNodeIdByNodeId = new Map<string, string>();
  for (const [, value] of Object.entries(dataset)) {
    const records = Array.isArray(value) ? value : [value];
    for (const record of records as Record<string, string>[]) {
      if (record.NodeID && record.NodeLinkedNodeID) {
        linkedNodeIdByNodeId.set(record.NodeID, record.NodeLinkedNodeID);
      }
    }
  }
  console.log(`  ${linkedNodeIdByNodeId.size} nodes are recorded as links to another node`);

  console.log("Loading our imported pages...");
  const pages = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { id: true, customFields: true },
  });

  const pageIdByKenticoNodeId = new Map<string, string>();
  for (const p of pages) {
    const fields = JSON.parse(p.customFields!) as { key: string; value: string }[];
    const nodeId = fields.find((f) => f.key === "_kenticoNodeId")?.value;
    if (nodeId) pageIdByKenticoNodeId.set(nodeId, p.id);
  }

  let linked = 0;
  let targetMissing = 0;

  const existingLinks = await prisma.page.count({ where: { linkedPageId: { not: null } } });
  if (existingLinks > 0) {
    console.log(`${existingLinks} pages already have a linkedPageId set — skipping (already deduped).`);
    return;
  }

  for (const [nodeId, linkedNodeId] of linkedNodeIdByNodeId) {
    const ourId = pageIdByKenticoNodeId.get(nodeId);
    const targetId = pageIdByKenticoNodeId.get(linkedNodeId);
    if (!ourId) continue;
    if (!targetId) {
      targetMissing++;
      continue;
    }
    if (ourId === targetId) continue;

    await prisma.page.update({
      where: { id: ourId },
      data: {
        linkedPageId: targetId,
        subtitle: null,
        bodyContent: null,
        tagline: null,
        heroImageUrl: null,
        galleryUrls: null,
        seoTitle: null,
        seoDescription: null,
        callToActionLabel: null,
        callToActionUrl: null,
        membershipTier: null,
      },
    });
    linked++;
  }

  console.log(`\nLinked ${linked} duplicate pages to their canonical page.`);
  console.log(`(${targetMissing} had a link target that wasn't imported as a page — left untouched.)`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
