// Phase 2a of the image import: figure out which real Kentico document
// attachments (the only binary images actually present in this export —
// the Media Library binaries were never included) belong to which of our
// already-imported pages, and write a manifest of {guid, ext, mimeType,
// pageId, role} for the extraction step to consume.
//
// Why this exists: each imported page's `_kenticoHeroImageRef` points at a
// Media Library file GUID, and NONE of those GUIDs exist in
// cms_attachment.xml.export (confirmed by direct check — media library
// binaries are simply absent from this export). But cms_attachment.xml.export
// itself has 9,294 real image files, each tied to a Kentico DocumentID. We
// recover those by mapping NodeID -> DocumentID (from cms_document) and then
// DocumentID -> attachments (from cms_attachment), joined against the
// `_kenticoNodeId` we already stored on every Page.
//
// Usage: npx tsx kentico-import/match-attachments-to-pages.ts <export-dir> <manifest-out.json>

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exportDir = process.argv[2];
const manifestOut = process.argv[3];
if (!exportDir || !manifestOut) {
  console.error("Usage: npx tsx kentico-import/match-attachments-to-pages.ts <export-dir> <manifest-out.json>");
  process.exit(1);
}

const DOCUMENT_XML = path.join(exportDir, "Data", "Documents", "cms_document.xml.export");
const ATTACHMENT_XML = path.join(exportDir, "Data", "Documents", "cms_attachment.xml.export");

const MAX_GALLERY_PER_PAGE = 6;

type AttachmentEntry = {
  guid: string;
  name: string;
  ext: string;
  mimeType: string;
  size: number;
};

type ManifestEntry = {
  pageId: string;
  role: "hero" | "gallery";
  guid: string;
  ext: string;
  mimeType: string;
  name: string;
};

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

async function main() {
  console.log("Parsing cms_document.xml.export for NodeID -> DocumentID...");
  const docParser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  const docXml = readFileSync(DOCUMENT_XML, "utf-8");
  const docParsed = docParser.parse(docXml);
  const docDataset = docParsed.cms_document.NewDataSet;

  const documentIdByNodeId = new Map<string, string>();
  for (const [, value] of Object.entries(docDataset)) {
    const records = Array.isArray(value) ? value : [value];
    for (const record of records as Record<string, string>[]) {
      if (record.NodeID && record.DocumentID) {
        documentIdByNodeId.set(record.NodeID, record.DocumentID);
      }
    }
  }
  console.log(`  NodeID -> DocumentID map: ${documentIdByNodeId.size} entries`);

  console.log("Parsing cms_attachment.xml.export for DocumentID -> attachments...");
  const attParser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
  const attXml = readFileSync(ATTACHMENT_XML, "utf-8");
  const attParsed = attParser.parse(attXml);
  const attRecords = attParsed.cms_attachment.NewDataSet.cms_attachment;
  const attList = Array.isArray(attRecords) ? attRecords : [attRecords];

  const attachmentsByDocumentId = new Map<string, AttachmentEntry[]>();
  let imageCount = 0;
  for (const record of attList as Record<string, string>[]) {
    const mimeType = record.AttachmentMimeType ?? "";
    if (!isImage(mimeType)) continue;
    const docId = record.AttachmentDocumentID;
    if (!docId) continue;
    const entry: AttachmentEntry = {
      guid: record.AttachmentGUID,
      name: record.AttachmentName,
      ext: record.AttachmentExtension,
      mimeType,
      size: Number(record.AttachmentSize ?? 0),
    };
    const list = attachmentsByDocumentId.get(docId) ?? [];
    list.push(entry);
    attachmentsByDocumentId.set(docId, list);
    imageCount++;
  }
  console.log(`  ${imageCount} image attachments across ${attachmentsByDocumentId.size} documents`);

  console.log("Loading our imported pages...");
  const pages = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { id: true, customFields: true, heroImageUrl: true },
  });
  console.log(`  ${pages.length} pages carry a _kenticoNodeId`);

  const manifest: ManifestEntry[] = [];
  let pagesWithImages = 0;

  for (const page of pages) {
    const fields = JSON.parse(page.customFields!) as { key: string; value: string }[];
    const nodeId = fields.find((f) => f.key === "_kenticoNodeId")?.value;
    if (!nodeId) continue;
    const documentId = documentIdByNodeId.get(nodeId);
    if (!documentId) continue;
    const attachments = attachmentsByDocumentId.get(documentId);
    if (!attachments || attachments.length === 0) continue;

    // Largest image first tends to be the "real" photo rather than an icon/thumbnail.
    const sorted = [...attachments].sort((a, b) => b.size - a.size);
    manifest.push({
      pageId: page.id,
      role: "hero",
      guid: sorted[0].guid,
      ext: sorted[0].ext,
      mimeType: sorted[0].mimeType,
      name: sorted[0].name,
    });
    for (const extra of sorted.slice(1, 1 + MAX_GALLERY_PER_PAGE)) {
      manifest.push({
        pageId: page.id,
        role: "gallery",
        guid: extra.guid,
        ext: extra.ext,
        mimeType: extra.mimeType,
        name: extra.name,
      });
    }
    pagesWithImages++;
  }

  console.log(`\nMatched ${pagesWithImages} pages to at least one real image (${manifest.length} total files to extract).`);
  writeFileSync(manifestOut, JSON.stringify(manifest, null, 2));
  console.log(`Manifest written to ${manifestOut}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
