// After compress-images.ts converts everything to .jpg, the DB (populated by
// attach-images.ts before compression ran) still points at the old
// .png/.jpeg/.JPG filenames. Rather than trust the in-process rename map from
// a script that got interrupted partway once, this compares each stored URL's
// basename (GUID) against what's actually on disk now and fixes up the
// extension whenever they've diverged.
import { readdirSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const DIR = path.join(process.cwd(), "public", "uploads", "kentico");

function currentUrlFor(oldUrl: string, filesOnDisk: Set<string>): string | null {
  const oldName = path.basename(oldUrl);
  if (filesOnDisk.has(oldName)) return null; // unchanged
  const base = oldName.replace(/\.[^.]+$/, "");
  const jpgName = `${base}.jpg`;
  if (filesOnDisk.has(jpgName)) return `/uploads/kentico/${jpgName}`;
  return "MISSING";
}

async function main() {
  const filesOnDisk = new Set(readdirSync(DIR));

  const media = await prisma.media.findMany({ where: { url: { startsWith: "/uploads/kentico/" } } });
  let mediaFixed = 0;
  let mediaMissing = 0;
  for (const m of media) {
    const next = currentUrlFor(m.url, filesOnDisk);
    if (next === null) continue;
    if (next === "MISSING") {
      mediaMissing++;
      continue;
    }
    await prisma.media.update({
      where: { id: m.id },
      data: { url: next, filename: path.basename(next), mimeType: "image/jpeg" },
    });
    mediaFixed++;
  }

  const pages = await prisma.page.findMany({
    where: { OR: [{ heroImageUrl: { startsWith: "/uploads/kentico/" } }, { galleryUrls: { contains: "/uploads/kentico/" } }] },
    select: { id: true, heroImageUrl: true, galleryUrls: true },
  });
  let pagesFixed = 0;
  let pagesMissing = 0;
  for (const p of pages) {
    let heroUrl = p.heroImageUrl;
    let changed = false;
    if (heroUrl?.startsWith("/uploads/kentico/")) {
      const next = currentUrlFor(heroUrl, filesOnDisk);
      if (next === "MISSING") {
        heroUrl = null;
        changed = true;
        pagesMissing++;
      } else if (next) {
        heroUrl = next;
        changed = true;
      }
    }

    const galleryUrls = p.galleryUrls ? (JSON.parse(p.galleryUrls) as string[]) : [];
    const newGallery: string[] = [];
    for (const url of galleryUrls) {
      if (!url.startsWith("/uploads/kentico/")) {
        newGallery.push(url);
        continue;
      }
      const next = currentUrlFor(url, filesOnDisk);
      if (next === "MISSING") {
        changed = true;
        continue;
      } else if (next) {
        newGallery.push(next);
        changed = true;
      } else {
        newGallery.push(url);
      }
    }

    if (changed) {
      await prisma.page.update({
        where: { id: p.id },
        data: { heroImageUrl: heroUrl, galleryUrls: newGallery.length ? JSON.stringify(newGallery) : null },
      });
      pagesFixed++;
    }
  }

  console.log(`Media rows fixed: ${mediaFixed}, missing on disk: ${mediaMissing}`);
  console.log(`Pages fixed: ${pagesFixed}, hero images now missing: ${pagesMissing}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
