// Builds kentico-import/content-backfill.json: the text the first import left
// behind. import-real-pages.ts skipped every field starting Node/Document/Class,
// which dropped two things that matter on the new site:
//   * DocumentContent  - the body text of Kentico "menu item" pages (terms,
//     cookie policy, accessibility, contact...) and a few itineraries, held in
//     a webpart zone as CDATA.
//   * DocumentPageTitle / DocumentPageDescription - the page's SEO title and
//     meta description.
// ensure-content.ts applies the fixture once, additively: it only fills a
// field that is currently empty, so nothing an editor wrote is touched.
//
// Usage: npx tsx kentico-import/build-content-fixture.ts <path-to-cms_document.xml.export>

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { XMLParser } from "fast-xml-parser";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const input = process.argv[2];
if (!input) {
  console.error("Usage: npx tsx kentico-import/build-content-fixture.ts <path-to-cms_document.xml.export>");
  process.exit(1);
}

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&rsquo;": "’", "&lsquo;": "‘", "&ldquo;": "“", "&rdquo;": "”", "&ndash;": "–", "&mdash;": "—", "&pound;": "£" };

// Paragraph breaks are kept (blank line between blocks) because the public
// page splits body text on blank lines.
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|table|tr)>/gi, "\n\n")
    .replace(/<\s*li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/gi, (e) => ENTITIES[e.toLowerCase()] ?? e)
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function webpartText(documentContent: string | undefined): string {
  if (!documentContent) return "";
  return htmlToText([...documentContent.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1]).join("\n\n"));
}

async function main() {
  const ds = new XMLParser({ ignoreAttributes: true, parseTagValue: false }).parse(readFileSync(input, "utf-8")).cms_document.NewDataSet as Record<string, unknown>;

  const pages = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    select: { slug: true, customFields: true, bodyContent: true, seoTitle: true, seoDescription: true },
  });
  const bySlugNode = new Map<string, { slug: string; hasBody: boolean; hasTitle: boolean; hasDesc: boolean }>();
  for (const p of pages) {
    const m = (p.customFields ?? "").match(/"key":"_kenticoNodeId","value":"(\d+)"/);
    if (m) bySlugNode.set(m[1], { slug: p.slug, hasBody: !!p.bodyContent, hasTitle: !!p.seoTitle, hasDesc: !!p.seoDescription });
  }

  const out: { slug: string; body?: string; seoTitle?: string; seoDescription?: string }[] = [];
  for (const [cls, v] of Object.entries(ds)) {
    const docs = ([] as Record<string, string>[]).concat(v as never).filter((x) => x && typeof x === "object" && x.NodeID);
    for (const d of docs) {
      const page = bySlugNode.get(d.NodeID);
      if (!page) continue;
      const entry: { slug: string; body?: string; seoTitle?: string; seoDescription?: string } = { slug: page.slug };
      if (!page.hasBody && (cls === "cms.menuitem" || cls === "sz.itinerary" || cls === "sz.itineraryday")) {
        const body = webpartText(d.DocumentContent);
        if (body.length > 40) entry.body = body;
      }
      const title = htmlToText(d.DocumentPageTitle ?? "");
      const desc = htmlToText(d.DocumentPageDescription ?? "");
      if (title && !page.hasTitle) entry.seoTitle = title.slice(0, 200);
      if (desc && !page.hasDesc) entry.seoDescription = desc.slice(0, 400);
      if (entry.body || entry.seoTitle || entry.seoDescription) out.push(entry);
    }
  }

  const file = path.join(__dirname, "content-backfill.json");
  writeFileSync(file, JSON.stringify(out));
  console.log(`Wrote ${out.length} entries: ${out.filter((e) => e.body).length} bodies, ${out.filter((e) => e.seoTitle).length} SEO titles, ${out.filter((e) => e.seoDescription).length} SEO descriptions -> ${file}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
