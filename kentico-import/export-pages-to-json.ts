// Exports the locally-imported + reconciled real Kentico page tree into a
// committed JSON fixture, the same way kentico-import/reference-data.json
// already does for facilities/locations/tiers. This lets production seed the
// real content idempotently via prisma/seed.ts without needing the raw
// (gitignored, 65MB+) Kentico export files at deploy time.
//
// The 4 pages that got merged into existing hand-built demo pages (Home,
// Things To Do, Places To Stay, Somerset Stories — see
// reconcile-demo-vs-real.ts) are NOT re-exported themselves, since they
// already exist via the normal seed flow. Their real children instead carry
// `attachToExistingSlug` so the production importer re-parents under the
// live demo page by slug instead of recreating it.
import { writeFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const OUT = path.join(process.cwd(), "kentico-import", "real-pages.json");

// Slugs of the hand-built demo pages that real content now nests under.
const CANONICAL_DEMO_SLUGS = new Set(["home", "things-to-do", "places-to-stay", "somerset-stories"]);

type ExportedPage = {
  exportId: number;
  exportParentId: number | null;
  attachToExistingSlug: string | null;
  title: string;
  subtitle: string | null;
  slug: string;
  bodyContent: string | null;
  tagline: string | null;
  membershipTier: string | null;
  isSection: boolean;
  status: string;
  sortOrder: number;
  heroImageUrl: string | null;
  galleryUrls: string | null;
  customFields: string | null;
};

async function main() {
  const allPages = await prisma.page.findMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Loaded ${allPages.length} real-content pages from local DB.`);

  const byId = new Map(allPages.map((p) => [p.id, p]));
  const canonicalDemoIdToSlug = new Map<string, string>();
  for (const slug of CANONICAL_DEMO_SLUGS) {
    const demo = await prisma.page.findUnique({ where: { slug } });
    if (demo) canonicalDemoIdToSlug.set(demo.id, slug);
  }

  // Topological order: parents must be assigned an exportId before children
  // reference it. Since local parentId chains are already valid (created in
  // level order originally), repeatedly pull pages whose parent is either
  // null, a canonical demo page, or already assigned.
  const exportIdByLocalId = new Map<string, number>();
  const ordered: typeof allPages = [];
  const remaining = new Set(allPages.map((p) => p.id));
  let progress = true;
  while (remaining.size > 0 && progress) {
    progress = false;
    for (const id of [...remaining]) {
      const page = byId.get(id)!;
      const parentId = page.parentId;
      const parentReady =
        !parentId || canonicalDemoIdToSlug.has(parentId) || exportIdByLocalId.has(parentId);
      if (!parentReady) continue;
      exportIdByLocalId.set(id, ordered.length + 1);
      ordered.push(page);
      remaining.delete(id);
      progress = true;
    }
  }
  if (remaining.size > 0) {
    console.warn(`${remaining.size} pages could not be ordered (dangling parent) — skipping them.`);
  }

  const exported: ExportedPage[] = ordered.map((page) => {
    const parentId = page.parentId;
    const attachToExistingSlug = parentId ? canonicalDemoIdToSlug.get(parentId) ?? null : null;
    const exportParentId =
      parentId && !attachToExistingSlug ? exportIdByLocalId.get(parentId) ?? null : null;
    return {
      exportId: exportIdByLocalId.get(page.id)!,
      exportParentId,
      attachToExistingSlug,
      title: page.title,
      subtitle: page.subtitle,
      slug: page.slug,
      bodyContent: page.bodyContent,
      tagline: page.tagline,
      membershipTier: page.membershipTier,
      isSection: page.isSection,
      status: page.status,
      sortOrder: page.sortOrder,
      heroImageUrl: page.heroImageUrl,
      galleryUrls: page.galleryUrls,
      customFields: page.customFields,
    };
  });

  writeFileSync(OUT, JSON.stringify(exported));
  console.log(`Exported ${exported.length} pages to ${OUT}`);
  const sizeMb = Buffer.byteLength(JSON.stringify(exported)) / 1024 / 1024;
  console.log(`Fixture size: ${sizeMb.toFixed(1)}MB`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
