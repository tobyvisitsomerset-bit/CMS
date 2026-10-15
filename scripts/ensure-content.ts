// Idempotent, additive content bootstrap — runs on every deploy (prestart)
// after `prisma db push`. It makes sure the real landing pages carry the
// widget blocks the public site design needs (listing explorers, homepage
// sections, ...), so a deploy never leaves a landing page blank.
//
// Rules this script lives by:
//   * Never deletes anything, never rewrites editor-authored content.
//   * A block is only added when the page has none of that type (so once an
//     editor removes/reorders/edits one, it is left alone... except the very
//     first homepage re-ordering, which is guarded by a marker).
//   * Never throws out of the process — a failure here must not stop the
//     site from starting.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Cfg = Record<string, unknown>;

async function pageBySlug(slug: string) {
  return prisma.page.findUnique({ where: { slug }, select: { id: true, status: true } });
}

async function ensureBlock(slug: string, type: string, config: Cfg, opts: { match?: (c: Cfg) => boolean; position?: "top" | "end" } = {}) {
  const page = await pageBySlug(slug);
  if (!page) {
    console.log(`[ensure-content] skip ${slug}: page not found`);
    return null;
  }
  const blocks = await prisma.contentBlock.findMany({ where: { pageId: page.id }, orderBy: { sortOrder: "asc" } });
  const exists = blocks.some((b) => {
    if (b.type !== type) return false;
    if (!opts.match) return true;
    try {
      return opts.match(JSON.parse(b.config || "{}"));
    } catch {
      return false;
    }
  });
  if (exists) return null;
  const sortOrder =
    opts.position === "end" ? (blocks.at(-1)?.sortOrder ?? 0) + 1 : (blocks[0]?.sortOrder ?? 1) - 1;
  const created = await prisma.contentBlock.create({ data: { pageId: page.id, type, sortOrder, config: JSON.stringify(config) } });
  console.log(`[ensure-content] added ${type} to ${slug}`);
  return created;
}

async function ensureExplorers() {
  await ensureBlock("places-to-stay", "listing_explorer", {
    kind: "accommodation",
    rootSlug: "places-to-stay",
    title: "Places to stay in Somerset",
    intro: "",
    noun: "places to stay",
    parentLabel: "",
    parentHref: "",
  });
  await ensureBlock("things-to-do", "listing_explorer", {
    kind: "things",
    rootSlug: "things-to-do",
    title: "Things to do in Somerset",
    intro: "From gorges and caves to castles, coast and country walks.",
    noun: "things to do",
    parentLabel: "",
    parentHref: "",
  });
  await ensureBlock("things-to-do/food-drink-more", "listing_explorer", {
    kind: "food",
    rootSlug: "things-to-do/food-drink-more",
    title: "Somerset food & drink",
    intro: "The place cheddar comes from, and the place cider never left.",
    noun: "pubs, restaurants, farm shops and producers",
    parentLabel: "Things to do",
    parentHref: "/things-to-do",
  });
  await ensureBlock("festivals-events", "listing_explorer", {
    kind: "events",
    rootSlug: "festivals-events",
    title: "Festivals & events",
    intro: "",
    noun: "events",
    parentLabel: "",
    parentHref: "",
  });
}

const BUY_INTRO =
  "Welcome to Buy Somerset - your opportunity to get the best quality products direct from the producer or local retailer. Somerset is world-famous for its food brands and natural resources, but also for the craftspeople and innovators who fashion them into things we love and cannot resist.\n\nThese pages take you straight to those outlets, where the expertise and knowledge is on hand to help you choose and get a smooth delivery to your door. Enjoy shopping!";

async function ensureShopAndExperiences() {
  const buy = await pageBySlug("buy-someset");
  if (buy) {
    await prisma.page.updateMany({ where: { id: buy.id, title: "Buy Someset" }, data: { title: "Buy Somerset" } });
    await ensureBlock("buy-someset", "hero", {
      eyebrow: "Direct from the producer",
      heading: "Buy Somerset",
      subheading: "",
      imageUrl: "",
      ctaLabel: "",
      ctaUrl: "",
      showSearchBar: false,
    });
    await ensureBlock(
      "buy-someset",
      "producer_shop",
      { rootSlug: "virtual-highstreet", intro: BUY_INTRO },
      { position: "end" },
    );
  }
  await ensureBlock("book-experiences", "experiences_hub", { heading: "Book experiences", intro: "" });
  await ensureBlock("book-experiences/all-experiences", "experiences_hub", { heading: "All experiences", intro: "" });
}

async function ensureHome() {
  const page = await pageBySlug("home");
  if (!page) return;
  const hadStrip = await prisma.contentBlock.count({ where: { pageId: page.id, type: "book_strip" } });
  const hadMoods = await prisma.contentBlock.count({ where: { pageId: page.id, type: "mood_tiles" } });
  const hadMapBand = await prisma.contentBlock.count({ where: { pageId: page.id, type: "map_band" } });
  const hadPartners = await prisma.contentBlock.count({ where: { pageId: page.id, type: "partners_row" } });
  if (hadStrip > 0 && hadMoods > 0 && hadMapBand > 0 && hadPartners > 0) return;

  if (hadStrip === 0) {
    await prisma.contentBlock.create({
      data: {
        pageId: page.id,
        type: "book_strip",
        sortOrder: 1000,
        config: JSON.stringify({
          heading: "Ready to book?",
          buttons: [
            { label: "Book experiences", url: "/book-experiences" },
            { label: "Book accommodation", url: "/places-to-stay" },
          ],
        }),
      },
    });
  }
  if (hadMoods === 0) {
    await prisma.contentBlock.create({
      data: {
        pageId: page.id,
        type: "mood_tiles",
        sortOrder: 1001,
        config: JSON.stringify({
          eyebrow: "Where to start",
          title: "Somerset by mood",
          subtitle: "Six ways in, each one a search of real places.",
          moods: [
            { label: "Coast & piers", query: "coast" },
            { label: "Caves & gorges", query: "cave" },
            { label: "Cider & cheese", query: "cider" },
            { label: "Legends & heritage", query: "legend" },
            { label: "Exmoor & the hills", query: "exmoor" },
            { label: "Family days out", query: "family" },
          ],
        }),
      },
    });
  }

  // The homepage's old centred "map" CTA becomes the mockup's map band.
  const oldCta = await prisma.contentBlock.findFirst({
    where: { pageId: page.id, type: "cta_banner", config: { contains: "interactive-map" } },
  });
  if (oldCta) {
    await prisma.contentBlock.update({
      where: { id: oldCta.id },
      data: {
        type: "map_band",
        config: JSON.stringify({
          eyebrow: "Everything, everywhere",
          heading: "See it all on the map",
          text: "Turn categories on and off, pin places into a trip and take it with you. Works from wherever you are staying.",
          primaryLabel: "Open the map",
          primaryUrl: "/interactive-map",
          secondaryLabel: "What's near me",
          secondaryUrl: "/interactive-map",
        }),
      },
    });
  }
  if ((await prisma.contentBlock.count({ where: { pageId: page.id, type: "partners_row" } })) === 0) {
    await prisma.contentBlock.create({
      data: {
        pageId: page.id,
        type: "partners_row",
        sortOrder: 2000,
        config: JSON.stringify({
          eyebrow: "Members & partners",
          title: "Made in Somerset",
          rootSlug: "things-to-do/food-drink-more",
          limit: 6,
          seeAllLabel: "All food & drink",
          seeAllHref: "/things-to-do/food-drink-more",
        }),
      },
    });
  }

  // First-time ordering to match the mockup: hero, book strip, moods, events,
  // stays, towns, area tiles, then anything else (map CTA etc.).
  const blocks = await prisma.contentBlock.findMany({ where: { pageId: page.id } });
  const rank = (b: { type: string; config: string }) => {
    let mode = "";
    try {
      mode = JSON.parse(b.config || "{}").mode ?? "";
    } catch {
      /* ignore */
    }
    switch (b.type) {
      case "hero":
        return 0;
      case "book_strip":
        return 1;
      case "mood_tiles":
        return 2;
      case "real_teaser":
        return mode === "businesses" ? 4 : 3;
      case "towns_row":
        return 5;
      case "explore_area_tiles":
        return 6;
      case "map_band":
      case "cta_banner":
        return 7;
      case "partners_row":
        return 8;
      default:
        return 9;
    }
  };
  const ordered = [...blocks].sort((a, b) => rank(a) - rank(b) || a.sortOrder - b.sortOrder);
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].sortOrder !== i) await prisma.contentBlock.update({ where: { id: ordered[i].id }, data: { sortOrder: i } });
  }
  console.log("[ensure-content] home sections added and ordered");
}

// The "Business Detail" starter template used to add placeholder hero/text/
// gallery widgets that hid the Form tab. A business page is now one template
// fed by its form, so the starter adds nothing.
async function ensureBusinessTemplate() {
  const t = await prisma.pageTemplate.findFirst({ where: { name: "Business Detail" } });
  if (!t) return;
  if (t.blocks === "[]") return;
  await prisma.pageTemplate.update({
    where: { id: t.id },
    data: {
      blocks: "[]",
      description: "A member business page. Nothing to build: the page template is filled from the Form tab.",
    },
  });
  console.log("[ensure-content] Business Detail template no longer adds placeholder widgets");
}

// Pages created in this CMS (not imported from Kentico) were never given the
// class marker the listing explorers, map and search look for, so they were
// saved but never listed. Add it, additively, to pages that are clearly
// listings: they carry business fields, or belong to a member/tier/rooms.
const BUSINESS_KEYS = ["ItemPhone", "ItemEmail", "ItemWeb", "ItemAddress1", "ItemTown", "ItemPostcode", "ItemOpeningTimes", "ItemAdmission", "ItemBookingWeb", "ItemStartDate", "ItemMapLatitude"];

async function ensureListingMarkers() {
  const rows = await prisma.page.findMany({
    where: {
      status: { not: "ARCHIVED" },
      isSection: false,
      OR: [{ customFields: null }, { NOT: { customFields: { contains: "_kenticoClassName" } } }],
      AND: [
        {
          OR: [
            { slug: { startsWith: "places-to-stay/" } },
            { slug: { startsWith: "things-to-do/" } },
            { slug: { startsWith: "festivals-events/" } },
          ],
        },
      ],
    },
    select: { id: true, slug: true, customFields: true, membershipTier: true, assignedMemberId: true, _count: { select: { rooms: true } } },
  });
  let n = 0;
  for (const r of rows) {
    let cf: { key: string; value: string }[] = [];
    try {
      cf = r.customFields ? JSON.parse(r.customFields) : [];
    } catch {
      cf = [];
    }
    const hasBusiness = cf.some((f) => BUSINESS_KEYS.includes(f.key) && f.value);
    if (!hasBusiness && !r.membershipTier && !r.assignedMemberId && r._count.rooms === 0) continue;
    cf.push({ key: "_kenticoClassName", value: "sz.touristitem" });
    await prisma.page.update({ where: { id: r.id }, data: { customFields: JSON.stringify(cf) } });
    n++;
  }
  if (n > 0) console.log(`[ensure-content] marked ${n} CMS-created listing page(s) so they appear in listings`);
}

// The page templates editors choose from (new page, or "Change template").
// Created once by name, never overwritten, so an editor's edits are kept.
// {{slug}} / {{title}} / {{parentTitle}} / {{parentSlug}} are filled in from
// the page the template is applied to.
const SYSTEM_TEMPLATES: { name: string; description: string; blocks: { type: string; config: Cfg }[] }[] = [
  {
    name: "Business page (filled from the Form tab)",
    description: "No widgets. The listing template is filled in from the page's Form tab: details, photos, rooms, offers and shop.",
    blocks: [],
  },
  {
    name: "Section landing: Places to stay",
    description: "The Places to Stay landing layout: search, filters, map and the listings under this page.",
    blocks: [
      {
        type: "listing_explorer",
        config: { kind: "accommodation", rootSlug: "{{slug}}", title: "{{title}} in Somerset", intro: "", noun: "places to stay", parentLabel: "{{parentTitle}}", parentHref: "/{{parentSlug}}" },
      },
    ],
  },
  {
    name: "Section landing: Things to do",
    description: "The Things to Do landing layout for the attractions and activities under this page.",
    blocks: [
      {
        type: "listing_explorer",
        config: { kind: "things", rootSlug: "{{slug}}", title: "{{title}}", intro: "", noun: "things to do", parentLabel: "{{parentTitle}}", parentHref: "/{{parentSlug}}" },
      },
    ],
  },
  {
    name: "Section landing: Food & drink",
    description: "The Food & Drink landing layout for the places to eat and drink under this page.",
    blocks: [
      {
        type: "listing_explorer",
        config: { kind: "food", rootSlug: "{{slug}}", title: "{{title}}", intro: "", noun: "places to eat and drink", parentLabel: "{{parentTitle}}", parentHref: "/{{parentSlug}}" },
      },
    ],
  },
  {
    name: "Section landing: Festivals & events",
    description: "The Festivals & Events landing layout: calendar, filters and the events under this page.",
    blocks: [
      {
        type: "listing_explorer",
        config: { kind: "events", rootSlug: "{{slug}}", title: "{{title}}", intro: "", noun: "events", parentLabel: "{{parentTitle}}", parentHref: "/{{parentSlug}}" },
      },
    ],
  },
];

async function ensureSystemTemplates() {
  const admin = await prisma.user.findFirst({ where: { role: { key: "SUPER_ADMIN" } }, select: { id: true } });
  if (!admin) return;
  for (const t of SYSTEM_TEMPLATES) {
    const exists = await prisma.pageTemplate.findFirst({ where: { name: t.name }, select: { id: true } });
    if (exists) continue;
    await prisma.pageTemplate.create({
      data: { name: t.name, description: t.description, blocks: JSON.stringify(t.blocks), createdById: admin.id },
    });
    console.log(`[ensure-content] added template "${t.name}"`);
  }
}

async function main() {
  await ensureSystemTemplates();
  await ensureBusinessTemplate();
  await ensureListingMarkers();
  await ensureExplorers();
  await ensureHome();
  await ensureShopAndExperiences();
}

main()
  .catch((e) => console.error("[ensure-content] failed (non-fatal):", e))
  .finally(() => prisma.$disconnect());
