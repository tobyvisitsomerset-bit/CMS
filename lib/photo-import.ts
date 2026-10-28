import { readFileSync } from "fs";
import { mkdir, statfs, stat, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { UPLOAD_DIR } from "@/lib/uploads";

// Recovers the photos the Kentico export did not contain. The export keeps
// every page's photo as a reference (~/getmedia/<guid>/name.jpg), and the
// current Visit Somerset site still serves those files. This fetches each
// original once, shrinks it to web size, stores it with the other uploads and
// fills the page's photo. It only ever fills a photo that is empty. It must be
// run before the old site is switched off.

const SOURCE = "https://www.visitsomerset.co.uk/";
const MAX_WIDTH = 1200;
const JPEG_QUALITY = 68;
const MIN_FREE_BYTES = 300 * 1024 * 1024;
const FAILED_KEY = "photo-import-failed";

// First one found is the page's main photo.
const HERO_KEYS = ["ItemImage", "_kenticoHeroImageRef", "MenuItemImage", "NewsImage", "BlogPostImage", "ItineraryImage", "CardImage", "AmbassadorImage"];

type Cf = { key: string; value: string }[];
type Manifest = { slug: string; refs: string[] }[];

let manifestCache: Map<string, string[]> | null = null;
function manifest(): Map<string, string[]> {
  if (!manifestCache) {
    manifestCache = new Map();
    try {
      const rows = JSON.parse(readFileSync(path.join(process.cwd(), "kentico-import", "gallery-manifest.json"), "utf-8")) as Manifest;
      for (const r of rows) manifestCache.set(r.slug, r.refs);
    } catch {
      /* no manifest: hero photos only */
    }
  }
  return manifestCache;
}

function galleryRefs(slug: string): string[] {
  return manifest().get(slug) ?? [];
}

function parseCf(raw: string | null): Cf {
  try {
    const v = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** "~/getmedia/<guid>/name.jpg.aspx?width=492&height=322&ext=.jpg" -> the original's address on the current site. */
export function refToSource(ref: string): { url: string; key: string } | null {
  const m = ref.match(/^~\/(getmedia|getattachment)\/([0-9a-f-]{36})\//i);
  if (!m) return null;
  try {
    const u = new URL(SOURCE + ref.slice(2));
    for (const p of ["width", "height", "maxsidesize", "lang"]) u.searchParams.delete(p);
    return { url: u.toString(), key: m[2].toLowerCase() };
  } catch {
    return null;
  }
}

function isImage(buf: Buffer): boolean {
  if (buf.length < 12) return false;
  const h = buf.subarray(0, 12);
  return (
    (h[0] === 0xff && h[1] === 0xd8) || // jpeg
    (h[0] === 0x89 && h[1] === 0x50) || // png
    h.subarray(0, 3).toString() === "GIF" ||
    (h.subarray(0, 4).toString() === "RIFF" && h.subarray(8, 12).toString() === "WEBP")
  );
}

/** Stores one photo and returns its site address, or null when it could not be fetched. */
async function fetchAndStore(ref: string, uploadedById: string | null): Promise<string | null> {
  const src = refToSource(ref);
  if (!src) return null;
  const filename = `site-${src.key}.jpg`;
  const target = path.join(UPLOAD_DIR, filename);
  try {
    await stat(target);
    return `/uploads/${filename}`; // already recovered
  } catch {
    /* not yet */
  }
  try {
    const res = await fetch(src.url, { redirect: "follow", signal: AbortSignal.timeout(25000), headers: { "user-agent": "VisitSomersetMigration/1.0" } });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 25 * 1024 * 1024 || !isImage(buf)) return null;
    const out = await sharp(buf).rotate().resize({ width: MAX_WIDTH, withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(target, out);
    await prisma.media.create({
      data: { filename, url: `/uploads/${filename}`, mimeType: "image/jpeg", size: out.length, kind: "image", uploadedById },
    });
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

async function failedIds(): Promise<string[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: FAILED_KEY } });
  try {
    return row ? (JSON.parse(row.value) as string[]) : [];
  } catch {
    return [];
  }
}

async function addFailed(ids: string[]) {
  if (ids.length === 0) return;
  const all = [...new Set([...(await failedIds()), ...ids])];
  await prisma.siteSetting.upsert({
    where: { key: FAILED_KEY },
    create: { key: FAILED_KEY, value: JSON.stringify(all) },
    update: { value: JSON.stringify(all) },
  });
}

// Advert slots are Kentico configuration, not pages anyone sees, so their images are skipped.
const PENDING_WHERE = {
  heroImageUrl: null,
  status: { not: "ARCHIVED" as const },
  customFields: { contains: "~/get" },
  NOT: { customFields: { contains: '"_kenticoClassName","value":"sz.ad"' } },
};

export type PhotoImportProgress = {
  remaining: number;
  recovered: number;
  gaveUp: number;
  withPhotoNow: number;
  stoppedBecause?: string;
};

export async function photoImportStatus(): Promise<PhotoImportProgress> {
  const failed = await failedIds();
  const [heroless, galleryPending, withPhotoNow] = await Promise.all([
    prisma.page.count({ where: { ...PENDING_WHERE, id: { notIn: failed } } }),
    prisma.page.count({ where: { heroImageUrl: { not: null }, galleryUrls: null, status: { not: "ARCHIVED" }, slug: { in: [...manifest().keys()] } } }),
    prisma.page.count({ where: { status: "PUBLISHED", heroImageUrl: { not: null } } }),
  ]);
  const remaining = heroless + galleryPending;
  const recovered = await prisma.media.count({ where: { filename: { startsWith: "site-" } } });
  return { remaining, recovered, gaveUp: failed.length, withPhotoNow };
}

/** Does one small batch of pages. Call repeatedly until remaining is 0. */
export async function importPhotoBatch(userId: string | null, batchSize = 10): Promise<PhotoImportProgress> {
  try {
    const fs = await statfs(UPLOAD_DIR).catch(() => statfs(path.dirname(UPLOAD_DIR)));
    if (fs.bavail * fs.bsize < MIN_FREE_BYTES) {
      return { ...(await photoImportStatus()), stoppedBecause: "The photo storage is almost full. Increase the volume size in Railway, then carry on." };
    }
  } catch {
    /* cannot read disk space: carry on */
  }

  const failed = await failedIds();
  const pages = await prisma.page.findMany({
    where: { ...PENDING_WHERE, id: { notIn: failed } },
    select: { id: true, slug: true, customFields: true, galleryUrls: true },
    orderBy: { id: "asc" },
    take: batchSize,
  });

  const gaveUp: string[] = [];
  for (const p of pages) {
    const cf = parseCf(p.customFields);
    const heroRefs = HERO_KEYS.map((k) => cf.find((f) => f.key === k)?.value).filter((v): v is string => !!v && v.startsWith("~/"));
    let hero: string | null = null;
    for (const ref of heroRefs) {
      hero = await fetchAndStore(ref, userId);
      if (hero) break;
    }
    if (!hero) {
      gaveUp.push(p.id);
      continue;
    }
    const data: { heroImageUrl: string; galleryUrls?: string } = { heroImageUrl: hero };
    if (!p.galleryUrls) {
      const urls: string[] = [];
      for (const ref of galleryRefs(p.slug).slice(0, 8)) {
        const u = await fetchAndStore(ref, userId);
        if (u && u !== hero && !urls.includes(u)) urls.push(u);
      }
      if (urls.length) data.galleryUrls = JSON.stringify(urls);
    }
    await prisma.page.update({ where: { id: p.id }, data });
  }
  await addFailed(gaveUp);

  // Pages that already have a main photo but never got their extra photos.
  if (pages.length < batchSize) {
    const withGallery = await prisma.page.findMany({
      where: { heroImageUrl: { not: null }, galleryUrls: null, status: { not: "ARCHIVED" }, slug: { in: [...manifest().keys()] } },
      select: { id: true, slug: true, heroImageUrl: true },
      take: batchSize - pages.length,
    });
    for (const p of withGallery) {
      const urls: string[] = [];
      for (const ref of galleryRefs(p.slug).slice(0, 8)) {
        const u = await fetchAndStore(ref, userId);
        if (u && u !== p.heroImageUrl && !urls.includes(u)) urls.push(u);
      }
      // An empty list is stored as "[]" so a page with nothing to recover is not retried.
      await prisma.page.update({ where: { id: p.id }, data: { galleryUrls: JSON.stringify(urls) } });
    }
  }
  return photoImportStatus();
}
