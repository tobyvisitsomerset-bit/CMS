// Builds kentico-import/gallery-manifest.json: for each listing, the extra
// photos Kentico held as separate "Member Image" records (sz.touristitemimage).
// The photo files were not in the export, but the current site still serves
// them, so lib/photo-import.ts fetches them from there using these references.
//
// Usage: npx tsx kentico-import/build-gallery-manifest.ts <path-to-cms_document.xml.export>

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const input = process.argv[2];
if (!input) {
  console.error("Usage: npx tsx kentico-import/build-gallery-manifest.ts <path-to-cms_document.xml.export>");
  process.exit(1);
}

async function main() {
  const ds = new XMLParser({ ignoreAttributes: true, parseTagValue: false }).parse(readFileSync(input, "utf-8")).cms_document.NewDataSet as Record<string, unknown>;
  const records = ([] as Record<string, string>[]).concat((ds["sz.touristitemimage"] as never) ?? []);

  const slugByNode = new Map<string, string>();
  const pages = await prisma.page.findMany({ where: { customFields: { contains: "_kenticoNodeId" } }, select: { slug: true, customFields: true } });
  for (const p of pages) {
    const m = (p.customFields ?? "").match(/"key":"_kenticoNodeId","value":"(\d+)"/);
    if (m) slugByNode.set(m[1], p.slug);
  }

  const byParent = new Map<string, { order: number; ref: string }[]>();
  for (const r of records) {
    const ref = Object.values(r).find((v) => /^~\/(getmedia|getattachment)\//i.test(String(v)));
    if (!ref) continue;
    const list = byParent.get(r.NodeParentID) ?? [];
    list.push({ order: Number(r.NodeOrder) || 0, ref: String(ref) });
    byParent.set(r.NodeParentID, list);
  }

  const out: { slug: string; refs: string[] }[] = [];
  for (const [node, list] of byParent) {
    const slug = slugByNode.get(node);
    if (!slug) continue;
    out.push({ slug, refs: list.sort((a, b) => a.order - b.order).map((x) => x.ref) });
  }
  writeFileSync(path.join(__dirname, "gallery-manifest.json"), JSON.stringify(out));
  console.log(`Wrote ${out.length} listings with ${out.reduce((n, e) => n + e.refs.length, 0)} gallery photos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
