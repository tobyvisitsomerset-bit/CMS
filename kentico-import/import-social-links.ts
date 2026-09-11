// Imports sz.sociallink nodes (excluded from the original import-real-pages.ts
// run) as real pages — small (7 records), site-wide footer social links, e.g.
// "Facebook - Visit Somerset". Additive only: creates new pages, parented
// under whichever already-imported ancestor page the node resolves to
// (walking up past any non-imported intermediate node, same approach as
// import-real-pages.ts's effectiveParentId). Skips any node already imported.
//
// Usage: npx tsx kentico-import/import-social-links.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/import-social-links.ts <path-to-extracted-export>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

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

  // Every node's parent link, regardless of class, so we can walk up past
  // any node that was never imported as a page.
  const parentByNodeId = new Map<string, string | null>();
  for (const [, value] of Object.entries(dataset)) {
    const records = Array.isArray(value) ? value : [value];
    for (const r of records as Record<string, string>[]) {
      if (r.NodeID) parentByNodeId.set(r.NodeID, r.NodeParentID ?? null);
    }
  }

  const links = arr(dataset, "sz.sociallink");
  console.log(`Found ${links.length} sz.sociallink nodes in the export.`);

  const superAdmin = await prisma.user.findFirst({ where: { role: { key: "SUPER_ADMIN" } } });
  if (!superAdmin) throw new Error("No Super Admin user found — run prisma/seed.ts first.");

  const allImported = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { id: true, customFields: true },
  });
  const pageIdByKenticoNodeId = new Map<string, string>();
  for (const p of allImported) {
    const nodeId = getField(parseCustomFields(p.customFields), "_kenticoNodeId");
    if (nodeId) pageIdByKenticoNodeId.set(nodeId, p.id);
  }

  function existingAncestorPageId(nodeId: string): string | null {
    let current = parentByNodeId.get(nodeId) ?? null;
    while (current) {
      const pid = pageIdByKenticoNodeId.get(current);
      if (pid) return pid;
      current = parentByNodeId.get(current) ?? null;
    }
    return null;
  }

  let created = 0;
  let skippedExisting = 0;

  for (const link of links) {
    if (pageIdByKenticoNodeId.has(link.NodeID)) {
      skippedExisting++;
      continue;
    }

    const title = link.SocialLinkTitle || link.DocumentName || `Social link ${link.NodeID}`;
    const customFields: { key: string; value: string }[] = [
      { key: "_kenticoNodeId", value: link.NodeID },
      { key: "_kenticoClassName", value: "sz.sociallink" },
    ];
    if (link.SocialLink) customFields.push({ key: "SocialLink", value: link.SocialLink });
    if (link.SocialLinkIcon) customFields.push({ key: "SocialLinkIcon", value: link.SocialLinkIcon });

    const baseSlug = slugify((link.NodeAliasPath || link.NodeID).replace(/^\//, ""));
    let slug = baseSlug || `social-link-${link.NodeID}`;
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${link.NodeID}`;

    const page = await prisma.page.create({
      data: {
        title,
        slug,
        status: link.DocumentIsArchived === "true" ? "ARCHIVED" : "PUBLISHED",
        parentId: existingAncestorPageId(link.NodeID),
        sortOrder: Number(link.NodeOrder ?? 0),
        authorId: superAdmin.id,
        ownerId: superAdmin.id,
        customFields: JSON.stringify(customFields),
      },
    });
    pageIdByKenticoNodeId.set(link.NodeID, page.id);
    created++;
    console.log(`  Created "${title}"`);
  }

  console.log(`\nDone. Created ${created} social-link pages, ${skippedExisting} already existed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
