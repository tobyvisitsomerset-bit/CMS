// Final step of the image import: for each entry in the manifest, move the
// already-extracted binary (stripping the Kentico ".export" suffix) into
// public/uploads/kentico/, create a Media row, and set Page.heroImageUrl /
// Page.galleryUrls accordingly.
//
// Usage: npx tsx kentico-import/attach-images.ts <manifest.json> <extracted-dir>

import { existsSync, mkdirSync, readFileSync, renameSync, statSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const manifestPath = process.argv[2];
const extractedDir = process.argv[3];
if (!manifestPath || !extractedDir) {
  console.error("Usage: npx tsx kentico-import/attach-images.ts <manifest.json> <extracted-dir>");
  process.exit(1);
}

type ManifestEntry = {
  pageId: string;
  role: "hero" | "gallery";
  guid: string;
  ext: string;
  mimeType: string;
  name: string;
};

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "kentico");

function normalizedExt(ext: string): string {
  return ext.toLowerCase();
}

async function main() {
  const manifest: ManifestEntry[] = JSON.parse(readFileSync(manifestPath, "utf-8"));
  mkdirSync(UPLOAD_DIR, { recursive: true });

  const byPage = new Map<string, ManifestEntry[]>();
  for (const entry of manifest) {
    const list = byPage.get(entry.pageId) ?? [];
    list.push(entry);
    byPage.set(entry.pageId, list);
  }

  let filesMoved = 0;
  let filesMissing = 0;
  let pagesUpdated = 0;
  const guidUrlCache = new Map<string, string | null>();

  function resolveUrl(entry: ManifestEntry): string | null {
    const cacheKey = entry.guid + entry.ext;
    if (guidUrlCache.has(cacheKey)) return guidUrlCache.get(cacheKey)!;

    const prefix = entry.guid.slice(0, 2);
    const sourcePath = path.join(
      extractedDir,
      "Data",
      "Files",
      "cms_attachment",
      prefix,
      `${entry.guid}${entry.ext}.export`
    );
    if (!existsSync(sourcePath)) {
      guidUrlCache.set(cacheKey, null);
      return null;
    }

    const destName = `${entry.guid}${normalizedExt(entry.ext)}`;
    const destPath = path.join(UPLOAD_DIR, destName);
    if (!existsSync(destPath)) {
      renameSync(sourcePath, destPath);
      filesMoved++;
    }
    const url = `/uploads/kentico/${destName}`;
    guidUrlCache.set(cacheKey, url);
    return url;
  }

  for (const [pageId, entries] of byPage) {
    const hero = entries.find((e) => e.role === "hero");
    const gallery = entries.filter((e) => e.role === "gallery");

    const heroUrl = hero ? resolveUrl(hero) : null;
    const galleryUrls = gallery.map(resolveUrl).filter((u): u is string => u !== null);

    if (!heroUrl) filesMissing += hero ? 1 : 0;
    filesMissing += gallery.length - galleryUrls.length;

    if (!heroUrl && galleryUrls.length === 0) continue;

    await prisma.page.update({
      where: { id: pageId },
      data: {
        heroImageUrl: heroUrl ?? undefined,
        galleryUrls: galleryUrls.length ? JSON.stringify(galleryUrls) : undefined,
      },
    });

    for (const entry of entries) {
      const url = resolveUrl(entry);
      if (!url) continue;
      const existing = await prisma.media.findFirst({ where: { url } });
      if (existing) continue;
      const destPath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      const size = existsSync(destPath) ? statSync(destPath).size : 0;
      await prisma.media.create({
        data: {
          filename: entry.name,
          url,
          mimeType: entry.mimeType,
          size,
          kind: "image",
        },
      });
    }

    pagesUpdated++;
  }

  console.log(`\nPages updated with real images: ${pagesUpdated}`);
  console.log(`Files moved into public/uploads/kentico: ${filesMoved}`);
  console.log(`Referenced files missing from extraction: ${filesMissing}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
