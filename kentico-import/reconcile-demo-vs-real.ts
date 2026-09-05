// The demo/mock landing pages (Places To Stay, Things To Do, Home, Somerset
// Stories) were hand-built earlier with curated Design-tab blocks
// (listing_search/listing_grid/etc). The real Kentico import recreated the
// same top-level folders under a collision-suffixed slug (e.g. "home-270")
// because the clean slug was already taken. This merges them: every child of
// the real duplicate root is re-parented onto the canonical demo page, then
// the now-childless duplicate root is deleted — so the curated hub page stays
// as the front door, with the full real content tree nested underneath it.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PAIRS: { canonicalSlug: string; duplicateSlug: string }[] = [
  { canonicalSlug: "home", duplicateSlug: "home-270" },
  { canonicalSlug: "things-to-do", duplicateSlug: "things-to-do-23673" },
  { canonicalSlug: "places-to-stay", duplicateSlug: "places-to-stay-278" },
  { canonicalSlug: "somerset-stories", duplicateSlug: "somerset-stories-44133" },
];

async function main() {
  for (const { canonicalSlug, duplicateSlug } of PAIRS) {
    const canonical = await prisma.page.findUnique({ where: { slug: canonicalSlug } });
    const duplicate = await prisma.page.findUnique({ where: { slug: duplicateSlug } });
    if (!canonical || !duplicate) {
      console.warn(`Skipping ${canonicalSlug} <- ${duplicateSlug}: one side missing`);
      continue;
    }
    const children = await prisma.page.findMany({ where: { parentId: duplicate.id } });
    console.log(`${duplicateSlug} -> ${canonicalSlug}: re-parenting ${children.length} children, then deleting duplicate root`);

    await prisma.page.updateMany({
      where: { parentId: duplicate.id },
      data: { parentId: canonical.id },
    });
    await prisma.page.delete({ where: { id: duplicate.id } });
  }
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
