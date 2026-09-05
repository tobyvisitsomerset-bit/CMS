// Imports the real Kentico page tree + content into our Page model.
// Phase 1: structure + text content only. Images are deferred to a follow-up
// pass (see import-real-images.ts) since they require selectively extracting
// specific files from a 13GB+ archive rather than the small XML exports here.
//
// Usage: npx tsx kentico-import/import-real-pages.ts <path-to-extracted-export>
// <path-to-extracted-export> should contain Data/Documents/cms_document.xml.export

import { readFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient, Prisma, type MembershipTier } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
if (!exportDir) {
  console.error("Usage: npx tsx kentico-import/import-real-pages.ts <path-to-extracted-export>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");

// Classes that become real navigable Pages in our tree. Everything else
// (touristitemimage/download/grading, itineraryday, sociallink, ad) is either
// deferred (images) or skipped as not valuable as a standalone page.
const PAGE_CLASSES = new Set([
  "cms.folder",
  "cms.menuitem",
  "cms.news",
  "cms.blog",
  "cms.blogmonth",
  "cms.blogpost",
  "sz.itinerary",
  "sz.ambassador",
  "sz.business",
  "sz.card",
  "sz.touristitem",
]);

const SECTION_CLASSES = new Set(["cms.folder", "cms.blog", "cms.blogmonth"]);

// MembershipTierDefinition.tier ItemID mapping, from customtable_sz_membership
// (Bronze=1, Silver=2, Gold=3, Platinum=4 — confirmed via ItemOrder in that export).
const MEMBERSHIP_BY_KENTICO_ID: Record<string, MembershipTier> = {
  "1": "BRONZE",
  "2": "SILVER",
  "3": "GOLD",
  "4": "PLATINUM",
};

type RawNode = {
  nodeId: string;
  parentId: string | null;
  level: number;
  order: number;
  aliasPath: string;
  className: string;
  fields: Record<string, string>;
};

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

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .replace(/-\/|\/-/g, "/");
}

// Per-class field mapping: which Kentico field becomes title/subtitle/body/hero.
// Everything else (Item*/other fields) is auto-captured into customFields.
const FIELD_MAP: Record<string, { title: string; subtitle?: string; body?: string; hero?: string; cardSummary?: string }> = {
  "cms.folder": { title: "NodeName" },
  "cms.menuitem": { title: "DocumentName" },
  "cms.news": { title: "NewsTitle", subtitle: "NewsSummary", body: "NewsText" },
  "cms.blog": { title: "NodeName" },
  "cms.blogmonth": { title: "NodeName" },
  "cms.blogpost": { title: "BlogPostTitle", subtitle: "BlogPostSummary", body: "BlogPostBody" },
  "sz.itinerary": { title: "ItineraryTitle", subtitle: "ItinerarySummary", body: "ItineraryDescription" },
  "sz.ambassador": { title: "AmbassadorName", body: "AmbassadorBio" },
  "sz.business": { title: "BusinessName", body: "BusinessDescription" },
  "sz.card": { title: "CardTitle", body: "CardDescription" },
  "sz.touristitem": {
    title: "ItemTitle",
    subtitle: "ItemSummary",
    body: "ItemDescription",
    hero: "ItemImageHero",
    cardSummary: "ItemCardSummary",
  },
};

async function main() {
  console.log(`Reading ${DOCUMENT_XML}...`);
  const xml = readFileSync(DOCUMENT_XML, "utf-8");
  console.log(`Parsing ${(xml.length / 1024 / 1024).toFixed(1)}MB of XML...`);

  const parser = new XMLParser({
    ignoreAttributes: true,
    parseTagValue: false, // keep everything as strings — we cast manually
  });
  const parsed = parser.parse(xml);
  const dataset = parsed.cms_document.NewDataSet;

  // First pass: record EVERY node's parent link, regardless of class, so we
  // can walk past excluded intermediate types (e.g. sz.itineraryday) below —
  // otherwise a page whose immediate Kentico parent is one of those excluded
  // classes gets orphaned to the tree root instead of nesting under its real
  // ancestor section.
  const parentIdByNodeId = new Map<string, string | null>();
  const classByNodeId = new Map<string, string>();
  for (const [tagName, value] of Object.entries(dataset)) {
    const records = Array.isArray(value) ? value : [value];
    for (const record of records as Record<string, string>[]) {
      if (!record.NodeID) continue;
      parentIdByNodeId.set(record.NodeID, record.NodeParentID ?? null);
      classByNodeId.set(record.NodeID, tagName);
    }
  }

  function effectiveParentId(nodeId: string): string | null {
    let current = parentIdByNodeId.get(nodeId) ?? null;
    while (current) {
      const currentClass = classByNodeId.get(current);
      if (currentClass && PAGE_CLASSES.has(currentClass)) return current;
      current = parentIdByNodeId.get(current) ?? null;
    }
    return null;
  }

  const rawNodes: RawNode[] = [];
  for (const [tagName, value] of Object.entries(dataset)) {
    if (!PAGE_CLASSES.has(tagName)) continue;
    const records = Array.isArray(value) ? value : [value];
    for (const record of records as Record<string, string>[]) {
      rawNodes.push({
        nodeId: record.NodeID,
        parentId: effectiveParentId(record.NodeID),
        level: Number(record.NodeLevel ?? 0),
        order: Number(record.NodeOrder ?? 0),
        aliasPath: record.NodeAliasPath ?? record.NodeAlias ?? record.NodeID,
        className: tagName,
        fields: record,
      });
    }
  }
  console.log(`Found ${rawNodes.length} page-worthy nodes across ${PAGE_CLASSES.size} classes.`);

  // Sort so parents are always created before children. Effective parents are
  // always shallower in the ORIGINAL tree (we only ever walk upward), so
  // sorting by original NodeLevel still guarantees a parent is created first.
  rawNodes.sort((a, b) => a.level - b.level || a.order - b.order);

  const superAdmin = await prisma.user.findFirst({ where: { role: { key: "SUPER_ADMIN" } } });
  if (!superAdmin) throw new Error("No Super Admin user found — run prisma/seed.ts first.");

  const ourPageIdByKenticoNodeId = new Map<string, string>();
  let created = 0;
  let skipped = 0;

  for (const node of rawNodes) {
    const mapping = FIELD_MAP[node.className];
    const title = (mapping ? node.fields[mapping.title] : undefined) || node.fields.NodeName || node.fields.DocumentName;
    if (!title) {
      skipped++;
      continue;
    }

    const parentOurId = node.parentId ? ourPageIdByKenticoNodeId.get(node.parentId) ?? null : null;

    const subtitleRaw = mapping?.subtitle ? node.fields[mapping.subtitle] : undefined;
    const bodyRaw = mapping?.body ? node.fields[mapping.body] : undefined;
    const heroRaw = mapping?.hero ? node.fields[mapping.hero] : undefined;
    const cardSummary = mapping?.cardSummary ? node.fields[mapping.cardSummary] : undefined;

    // Auto-capture every other Item*/Ambassador*/Business*/etc field (not Node*/Document*/Class*
    // meta, not already mapped above) into customFields for now — richer typed fields can follow later.
    const mappedFieldNames = new Set(Object.values(mapping ?? {}));
    const customFields: { key: string; value: string }[] = [];
    for (const [key, value] of Object.entries(node.fields)) {
      if (mappedFieldNames.has(key)) continue;
      if (/^(Node|Document|Class)/.test(key)) continue;
      if (!value || typeof value !== "string") continue;
      if (value.length > 2000) continue; // skip huge embedded HTML/webpart blobs
      customFields.push({ key, value });
    }
    customFields.push({ key: "_kenticoNodeId", value: node.nodeId });
    customFields.push({ key: "_kenticoClassName", value: node.className });
    if (heroRaw) customFields.push({ key: "_kenticoHeroImageRef", value: heroRaw });

    const membershipTier = node.fields.ItemMembership ? MEMBERSHIP_BY_KENTICO_ID[node.fields.ItemMembership] : undefined;

    const baseSlug = slugify(node.aliasPath.replace(/^\//, ""));
    let slug = baseSlug || `page-${node.nodeId}`;
    // Ensure uniqueness (Kentico allows some duplicate alias paths across languages/versions we don't handle here).
    const existing = await prisma.page.findUnique({ where: { slug } });
    if (existing) slug = `${slug}-${node.nodeId}`;

    try {
      const page = await prisma.page.create({
        data: {
          title,
          subtitle: subtitleRaw ? stripHtml(subtitleRaw).slice(0, 500) : cardSummary || null,
          slug,
          bodyContent: bodyRaw ? stripHtml(bodyRaw) : null,
          tagline: cardSummary && subtitleRaw ? stripHtml(cardSummary).slice(0, 200) : null,
          membershipTier: membershipTier ?? null,
          isSection: SECTION_CLASSES.has(node.className),
          status: node.fields.DocumentIsArchived === "true" ? "ARCHIVED" : "PUBLISHED",
          parentId: parentOurId,
          sortOrder: node.order,
          authorId: superAdmin.id,
          ownerId: superAdmin.id,
          customFields: JSON.stringify(customFields),
        },
      });
      ourPageIdByKenticoNodeId.set(node.nodeId, page.id);
      created++;
      if (created % 250 === 0) console.log(`  ...${created} pages created`);
    } catch (err) {
      skipped++;
      let reason: string;
      if (err instanceof Prisma.PrismaClientKnownRequestError) {
        reason = `${err.code} ${JSON.stringify(err.meta)}`;
      } else {
        // PrismaClientValidationError messages end with the actual argument
        // description after a code-frame — the useful part is at the END, not
        // the start, so grab the tail rather than truncating from the front.
        const raw = (err as Error).message.trim();
        reason = raw.split("\n").slice(-6).join(" | ").replace(/\s+/g, " ").trim().slice(-400);
      }
      console.warn(`Skipped node ${node.nodeId} (${title}) [slug=${slug}]: ${reason}`);
    }
  }

  console.log(`\nDone. Created ${created} pages, skipped ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
