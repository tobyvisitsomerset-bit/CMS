import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hasClassMarker } from "@/lib/listing-marker";

// "Why isn't this page showing in the list?" Answers it for the editor:
// is the page published, is it recognised as a listing, and which landing
// pages above it list what sits under them.

const BUSINESS_KEYS = ["ItemPhone", "ItemEmail", "ItemWeb", "ItemAddress1", "ItemTown", "ItemPostcode", "ItemOpeningTimes", "ItemAdmission", "ItemBookingWeb", "ItemStartDate"];

export type ListingDiagnostics = {
  isListing: boolean;
  published: boolean;
  problems: string[];
  appearsOn: { title: string; slug: string }[];
  /** Other places in the tree this page is linked into. */
  alsoOn: string[];
  /** Published pages beneath this section that are not marked as listings. */
  unmarkedBelow: number;
};

export async function getListingDiagnostics(page: {
  id: string;
  slug: string;
  status: string;
  parentId: string | null;
  customFields: string | null;
  linkedPageId: string | null;
  isSection: boolean;
}): Promise<ListingDiagnostics> {
  const problems: string[] = [];
  const isListing = hasClassMarker(page.customFields);
  const published = page.status === "PUBLISHED";

  // Walk up the tree collecting landing pages (those with a listing explorer).
  const appearsOn: { title: string; slug: string }[] = [];
  let parentId = page.parentId;
  for (let depth = 0; parentId && depth < 8; depth++) {
    const parent = await prisma.page.findUnique({
      where: { id: parentId },
      select: { id: true, title: true, slug: true, parentId: true, contentBlocks: { where: { type: "listing_explorer" }, select: { id: true } } },
    });
    if (!parent) break;
    if (parent.contentBlocks.length > 0) appearsOn.push({ title: parent.title, slug: parent.slug });
    parentId = parent.parentId;
  }

  if (!published) problems.push("This page is not published yet, so it is not listed. Publish it and it will appear.");
  if (page.linkedPageId) problems.push("This page is a link to another page, so the original is the one that is listed.");
  if (published && !page.isSection && !isListing) {
    problems.push(
      "This page is not marked as a listing, so lists and the map skip it. Save the Form tab once (with a town, phone or address filled in) to mark it.",
    );
  }
  if (published && isListing && appearsOn.length === 0) {
    problems.push(
      "No landing page sits above this page in the tree, so no list shows it. Move it under a section such as Hotels, or give its section a landing template.",
    );
  }
  const links = await prisma.page.findMany({
    where: { linkedPageId: page.id },
    select: { parent: { select: { title: true } } },
  });
  const alsoOn = links.map((l) => l.parent?.title).filter((t): t is string => !!t);

  let unmarkedBelow = 0;
  if (page.isSection || (await prisma.page.count({ where: { parentId: page.id } })) > 0) {
    const below = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      WITH RECURSIVE t AS (
        SELECT id FROM "Page" WHERE id = ${page.id}
        UNION ALL
        SELECT p.id FROM "Page" p JOIN t ON p."parentId" = t.id
      )
      SELECT id FROM t`);
    unmarkedBelow = await prisma.page.count({
      where: {
        id: { in: below.map((b) => b.id).filter((id) => id !== page.id) },
        status: "PUBLISHED",
        linkedPageId: null,
        isSection: false,
        OR: [{ customFields: null }, { NOT: { customFields: { contains: "_kenticoClassName" } } }],
        AND: [{ OR: BUSINESS_KEYS.map((k) => ({ customFields: { contains: `"key":"${k}"` } })) }],
      },
    });
  }
  return { isListing, published, problems, appearsOn, alsoOn, unmarkedBelow };
}
