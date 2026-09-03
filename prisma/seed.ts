import { PrismaClient, PageStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLE_KEYS, ROLE_LABELS } from "../lib/permissions";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: "pages.viewAll", description: "View all pages in the tree" },
  { key: "pages.create", description: "Create pages and sections" },
  { key: "pages.edit", description: "Edit page content" },
  { key: "pages.delete", description: "Delete pages" },
  { key: "pages.publish", description: "Publish / unpublish pages" },
  { key: "pages.archive", description: "Archive / restore pages" },
  { key: "pages.clone", description: "Clone pages" },
  { key: "pages.reorder", description: "Reorder the content tree" },
  { key: "media.upload", description: "Upload media assets" },
  { key: "media.delete", description: "Delete media assets" },
  { key: "workflow.review", description: "Review and approve submissions" },
  { key: "settings.manage", description: "Manage system settings" },
  { key: "audit.view", description: "View the audit log" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [ROLE_KEYS.SUPER_ADMIN]: PERMISSIONS.map((p) => p.key),
  [ROLE_KEYS.CONTENT_ADMIN]: [
    "pages.viewAll",
    "pages.create",
    "pages.edit",
    "pages.delete",
    "pages.publish",
    "pages.archive",
    "pages.clone",
    "pages.reorder",
    "media.upload",
    "media.delete",
    "workflow.review",
    "audit.view",
  ],
  [ROLE_KEYS.MEMBER]: ["pages.edit", "pages.clone", "media.upload"],
  [ROLE_KEYS.READ_ONLY]: [],
};

type TreeNode = {
  title: string;
  isSection?: boolean;
  status?: PageStatus;
  children?: TreeNode[];
};

const TREE: TreeNode[] = [
  { title: "Home", status: "PUBLISHED" },
  {
    title: "Places To Stay",
    status: "PUBLISHED",
    children: [
      { title: "Hotels", status: "PUBLISHED" },
      { title: "B&Bs", status: "PUBLISHED" },
      { title: "Camping", status: "DRAFT" },
      { title: "Glamping", status: "DRAFT" },
    ],
  },
  { title: "Things To Do", status: "PUBLISHED" },
  { title: "Food & Drink", status: "PUBLISHED" },
  { title: "Festivals & Events", status: "PUBLISHED" },
  { title: "Experiences", status: "DRAFT" },
  { title: "Somerset Stories", status: "PUBLISHED" },
  { title: "Business Hub", isSection: true, children: [{ title: "Advertise With Us", status: "DRAFT" }] },
  {
    title: "Member Pages",
    isSection: true,
    children: [{ title: "Cheddar Gorge", status: "PUBLISHED" }],
  },
];

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function createTree(
  nodes: TreeNode[],
  parentId: string | null,
  parentSlug: string,
  authorId: string,
  ownerId: string,
) {
  let order = 0;
  for (const node of nodes) {
    const slug = `${parentSlug}/${slugify(node.title)}`.replace(/^\//, "");
    const page = await prisma.page.create({
      data: {
        title: node.title,
        slug,
        isSection: node.isSection ?? false,
        status: node.status ?? "DRAFT",
        parentId,
        sortOrder: order++,
        authorId,
        ownerId,
        seoTitle: node.title,
        bodyContent: node.isSection ? null : `Placeholder content for ${node.title}.`,
      },
    });
    if (node.children) {
      await createTree(node.children, page.id, slug, authorId, ownerId);
    }
  }
}

async function main() {
  console.log("Seeding roles & permissions...");
  const permissionRecords = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { key: p.key },
        update: {},
        create: p,
      }),
    ),
  );

  const roles = await Promise.all(
    Object.values(ROLE_KEYS).map((key) =>
      prisma.role.upsert({
        where: { key },
        update: {},
        create: { key, name: ROLE_LABELS[key] },
      }),
    ),
  );

  for (const role of roles) {
    const grantedKeys = ROLE_PERMISSIONS[role.key] ?? [];
    for (const permKey of grantedKeys) {
      const permission = permissionRecords.find((p) => p.key === permKey);
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding users...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const roleByKey = Object.fromEntries(roles.map((r) => [r.key, r]));

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@visitsomerset.co.uk" },
    update: {},
    create: {
      name: "Toby Jones",
      email: "admin@visitsomerset.co.uk",
      passwordHash,
      roleId: roleByKey[ROLE_KEYS.SUPER_ADMIN].id,
    },
  });

  await prisma.user.upsert({
    where: { email: "content@visitsomerset.co.uk" },
    update: {},
    create: {
      name: "Casey Editor",
      email: "content@visitsomerset.co.uk",
      passwordHash,
      roleId: roleByKey[ROLE_KEYS.CONTENT_ADMIN].id,
    },
  });

  const member = await prisma.user.upsert({
    where: { email: "member@visitsomerset.co.uk" },
    update: {},
    create: {
      name: "Robin Gorge",
      email: "member@visitsomerset.co.uk",
      passwordHash,
      roleId: roleByKey[ROLE_KEYS.MEMBER].id,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@visitsomerset.co.uk" },
    update: {},
    create: {
      name: "Jamie Reader",
      email: "viewer@visitsomerset.co.uk",
      passwordHash,
      roleId: roleByKey[ROLE_KEYS.READ_ONLY].id,
    },
  });

  const existingPages = await prisma.page.count();
  if (existingPages === 0) {
    console.log("Seeding content tree...");
    await createTree(TREE, null, "", superAdmin.id, superAdmin.id);

    const cheddar = await prisma.page.findFirst({ where: { title: "Cheddar Gorge" } });
    if (cheddar) {
      await prisma.page.update({
        where: { id: cheddar.id },
        data: { assignedMemberId: member.id, visibility: "member-only" },
      });
    }
  }

  // Example business membership tier — only set if not already assigned, so it doesn't
  // clobber a tier an admin later changed via the Content tab.
  await prisma.page.updateMany({
    where: { title: "Cheddar Gorge", membershipTier: null },
    data: { membershipTier: "GOLD", tagline: "England's largest gorge, right on your doorstep" },
  });

  // Migration safety: "Places To Stay" started life as a folder section; it now needs
  // to be an editable page in its own right so it can carry Design-tab content.
  await prisma.page.updateMany({ where: { title: "Places To Stay" }, data: { isSection: false } });

  // Migration safety: earlier seed runs created "What's On" before it was renamed.
  const whatsOn = await prisma.page.findFirst({ where: { title: "What's On" } });
  if (whatsOn) {
    await prisma.page.update({
      where: { id: whatsOn.id },
      data: { title: "Festivals & Events", slug: "festivals-and-events" },
    });
  }
  // Clean up leftover copy from the old name, whichever seed run introduced it.
  await prisma.page.updateMany({
    where: { title: "Festivals & Events", seoTitle: "What's On" },
    data: { seoTitle: "Festivals & Events", bodyContent: "Placeholder content for Festivals & Events." },
  });

  console.log("Seeding listings...");
  const listingCount = await prisma.listing.count();
  if (listingCount === 0) {
    const now = new Date();
    const daysFromNow = (n: number) => new Date(now.getTime() + n * 86400000);

    await prisma.listing.createMany({
      data: [
        // Accommodation
        {
          category: "ACCOMMODATION",
          name: "Middlewick Holiday Cottages",
          summary:
            "Nine barns around a courtyard with an indoor pool and the Tor on the skyline — ten minutes from Glastonbury and Wells.",
          location: "Glastonbury · self-catering · 9 barn conversions",
          badges: JSON.stringify(["Dog friendly", "Step-free unit", "Hot tub", "EV charging"]),
          priceLabel: "£680 per week",
          rating: 4.9,
          reviewCount: 212,
          membershipTier: "PLATINUM",
          sortOrder: 0,
        },
        {
          category: "ACCOMMODATION",
          name: "The Swan Hotel, Wells",
          summary: "A coaching inn on the cathedral green with twelve individually decorated rooms.",
          location: "Wells · hotel",
          badges: JSON.stringify(["Dog friendly", "Restaurant on site"]),
          priceLabel: "£145 per night",
          rating: 4.6,
          reviewCount: 340,
          membershipTier: "GOLD",
          sortOrder: 1,
        },
        {
          category: "ACCOMMODATION",
          name: "Exmoor Glamping Pods",
          summary: "Off-grid pods on the edge of the moor, each with a wood burner and private hot tub.",
          location: "Exmoor · glamping",
          badges: JSON.stringify(["Hot tub", "Pet friendly", "Off-grid"]),
          priceLabel: "£320 for 3 nights",
          rating: 4.8,
          reviewCount: 98,
          membershipTier: "SILVER",
          sortOrder: 2,
        },
        {
          category: "ACCOMMODATION",
          name: "Cheddar Gorge Camping",
          summary: "Family-run touring and camping site five minutes' walk from the gorge.",
          location: "Cheddar · camping",
          badges: JSON.stringify(["Family friendly", "Dog friendly"]),
          priceLabel: "£28 per night",
          rating: 4.4,
          reviewCount: 156,
          membershipTier: "BRONZE",
          sortOrder: 3,
        },
        {
          category: "ACCOMMODATION",
          name: "Bath City Apartments",
          summary: "Self-catering apartments a short walk from the Roman Baths.",
          location: "Bath · self-catering",
          badges: JSON.stringify(["Step-free access", "EV charging"]),
          priceLabel: "£165 per night",
          rating: 4.5,
          reviewCount: 87,
          sortOrder: 4,
        },
        {
          category: "ACCOMMODATION",
          name: "Quantock Hills Farm Stay",
          summary: "A working farm offering B&B rooms and honesty-box breakfasts.",
          location: "Quantock Hills · farm stay",
          badges: JSON.stringify(["Dog friendly", "Family friendly"]),
          priceLabel: "£95 per night",
          rating: 4.7,
          reviewCount: 64,
          sortOrder: 5,
        },
        // Food & drink
        {
          category: "FOOD_DRINK",
          name: "The Newt in Somerset",
          summary: "Kitchen-garden menus, a parabola of apple trees and a cyder cellar you can walk through.",
          location: "Bruton · restaurant & cyder press",
          badges: JSON.stringify(["Booking needed", "Garden", "Step-free"]),
          rating: 4.9,
          membershipTier: "PLATINUM",
          sortOrder: 0,
        },
        {
          category: "FOOD_DRINK",
          name: "Thatchers Cider",
          summary: "Fourth-generation cider makers offering tastings and orchard tours.",
          location: "Sandford · brewery & distillery",
          badges: JSON.stringify(["Tours", "Family friendly"]),
          membershipTier: "GOLD",
          sortOrder: 1,
        },
        {
          category: "FOOD_DRINK",
          name: "The Cheddar Gorge Cheese Co.",
          summary: "Traditional cheddar made in the gorge, with a free viewing gallery.",
          location: "Cheddar · producer",
          badges: JSON.stringify(["Free viewing gallery"]),
          membershipTier: "SILVER",
          sortOrder: 2,
        },
        {
          category: "FOOD_DRINK",
          name: "Sally Lunn's",
          summary: "Bath's oldest house, famous for its Sally Lunn bun since 1680.",
          location: "Bath · cafe & tea room",
          badges: JSON.stringify(["Historic", "Walk-ins"]),
          membershipTier: "BRONZE",
          sortOrder: 3,
        },
        {
          category: "FOOD_DRINK",
          name: "Augustus",
          summary: "Modern British small plates in the heart of Taunton.",
          location: "Taunton · restaurant",
          badges: JSON.stringify(["Booking needed", "Tue-Sat"]),
          sortOrder: 4,
        },
        {
          category: "FOOD_DRINK",
          name: "Burrow Hill Cider Farm",
          summary: "West Country farmhouse cider, distilled brandy, and a summer cider bus.",
          location: "Kingsbury Episcopi · farm shop & producer",
          badges: JSON.stringify(["Farm shop", "Tours"]),
          sortOrder: 5,
        },
        // Attractions
        {
          category: "ATTRACTION",
          name: "Cheddar Gorge & Caves",
          summary: "England's largest gorge, with show caves and a cliff-top walk.",
          location: "Cheddar",
          badges: JSON.stringify(["Family friendly", "Dog friendly on lead"]),
          sortOrder: 0,
        },
        {
          category: "ATTRACTION",
          name: "Glastonbury Tor",
          summary: "A National Trust hill topped by St Michael's Tower, with views across the Levels.",
          location: "Glastonbury",
          badges: JSON.stringify(["National Trust", "Free entry"]),
          sortOrder: 1,
        },
        {
          category: "ATTRACTION",
          name: "Wells Cathedral",
          summary: "England's first fully Gothic cathedral, with its famous scissor arches.",
          location: "Wells",
          badges: JSON.stringify(["Step-free access"]),
          sortOrder: 2,
        },
        {
          category: "ATTRACTION",
          name: "Wookey Hole Caves",
          summary: "Show caves, a papermill, and a mirror maze for a rainy day out.",
          location: "Wookey Hole",
          badges: JSON.stringify(["Family friendly", "Indoor"]),
          sortOrder: 3,
        },
        // Events (dates relative to seed time so the calendar always looks populated)
        {
          category: "EVENT",
          name: "Truckfest South West",
          summary: "Truck show and family fun day, running since 1983.",
          location: "Bath & West Showground, Shepton Mallet",
          startDate: daysFromNow(2),
          endDate: daysFromNow(4),
          sortOrder: 0,
        },
        {
          category: "EVENT",
          name: "Stone Age SOS at Cheddar Gorge & Caves",
          summary: "Family activity day, 10am-5pm.",
          location: "Cheddar",
          startDate: daysFromNow(0),
          endDate: daysFromNow(5),
          sortOrder: 1,
        },
        {
          category: "EVENT",
          name: "Summer of Play: Knights' Quest",
          summary: "Outdoor trail and activities for kids, 11am-4pm.",
          location: "Dunster Castle",
          startDate: daysFromNow(0),
          endDate: daysFromNow(6),
          sortOrder: 2,
        },
        {
          category: "EVENT",
          name: "Taunton Military Wives Choir",
          summary: "Free outdoor concert in the town centre.",
          location: "Taunton",
          startDate: daysFromNow(1),
          sortOrder: 3,
        },
        {
          category: "EVENT",
          name: "Bridgwater Carnival",
          summary: "Europe's largest illuminated procession.",
          location: "Bridgwater",
          startDate: daysFromNow(12),
          sortOrder: 4,
        },
        {
          category: "EVENT",
          name: "Glastonbury Food & Drink Market",
          summary: "Monthly market of local producers on the high street.",
          location: "Glastonbury",
          startDate: daysFromNow(9),
          sortOrder: 5,
        },
      ],
    });
  }

  console.log("Seeding starter page templates...");
  const templateCount = await prisma.pageTemplate.count();
  if (templateCount === 0) {
    await prisma.pageTemplate.createMany({
      data: [
        {
          name: "Landing Page",
          description: "Hero banner, intro copy and a call-to-action strip — a general-purpose starting point.",
          createdById: superAdmin.id,
          blocks: JSON.stringify([
            { type: "hero", config: { heading: "Page heading", subheading: "", ctaLabel: "" } },
            { type: "text", config: { heading: "", body: "" } },
            { type: "cta_banner", config: { heading: "", subtext: "", buttonLabel: "", buttonUrl: "", style: "dark" } },
          ]),
        },
        {
          name: "Business Detail",
          description: "Hero with a tagline and summary, for a member business's own page.",
          createdById: superAdmin.id,
          blocks: JSON.stringify([
            { type: "hero", config: { heading: "Business name", subheading: "Tagline goes here", ctaLabel: "" } },
            { type: "text", config: { heading: "About", body: "" } },
            { type: "gallery", config: { imageUrls: [] } },
          ]),
        },
        {
          name: "Listing Page",
          description: "Search/filter bar plus a listing grid with map — the pattern used by Places To Stay.",
          createdById: superAdmin.id,
          blocks: JSON.stringify([
            { type: "listing_search", config: { title: "", subtitle: "", showSearchBar: true, filters: [] } },
            { type: "listing_grid", config: { category: "ACCOMMODATION", showMap: true } },
          ]),
        },
      ],
    });
  }

  console.log("Wiring landing page templates...");

  async function setPageBlocks(title: string, blocks: { type: string; config: Record<string, unknown> }[]) {
    const page = await prisma.page.findFirst({ where: { title } });
    if (!page) return;
    await prisma.contentBlock.deleteMany({ where: { pageId: page.id } });
    await prisma.contentBlock.createMany({
      data: blocks.map((b, i) => ({ pageId: page.id, type: b.type, sortOrder: i, config: JSON.stringify(b.config) })),
    });
  }

  await setPageBlocks("Home", [
    {
      type: "hero",
      config: {
        heading: "Be enchanted",
        subheading:
          "Cheddar and cider, Glastonbury and Georgian Bath, Exmoor and thirty miles of coast — all within an hour of each other.",
        ctaLabel: "Book a stay",
      },
    },
  ]);

  await setPageBlocks("Places To Stay", [
    {
      type: "listing_search",
      config: {
        title: "Places to stay in Somerset",
        subtitle: "1,240 places · 318 with rooms free this weekend",
        showSearchBar: true,
        filters: [
          "Dog friendly",
          "Hotels",
          "B&Bs & guest houses",
          "Self-catering",
          "Camping & glamping",
          "Holiday parks",
          "Farm stays",
          "Step-free access",
          "Hot tub",
          "EV charging",
        ],
      },
    },
    { type: "listing_grid", config: { category: "ACCOMMODATION", showMap: true } },
  ]);

  await setPageBlocks("Food & Drink", [
    {
      type: "listing_search",
      config: {
        title: "Somerset food & drink",
        subtitle:
          "The place cheddar comes from, and the place cider never left. 940 pubs, restaurants, farm shops and producers.",
        showSearchBar: false,
        filters: [
          "All",
          "Restaurants",
          "Pubs",
          "Cafés & tea rooms",
          "Farm shops & markets",
          "Breweries & distilleries",
          "Producers",
          "Takeaway",
          "Made in Somerset",
        ],
      },
    },
    {
      type: "cards",
      config: {
        columns: 2,
        items: [
          {
            title: "The cider & cheese route",
            description:
              "Nine stops from Thatchers at Sandford to the last cheddar makers in Cheddar, with Burrow Hill in between.",
            badge: "Themed trail",
          },
          {
            title: "The Newt in Somerset",
            description:
              "Kitchen-garden menus, a parabola of apple trees and a cyder cellar you can walk through.",
            badge: "Featured Member",
          },
        ],
      },
    },
    { type: "listing_grid", config: { category: "FOOD_DRINK", showMap: false } },
  ]);

  await setPageBlocks("Festivals & Events", [
    {
      type: "listing_search",
      config: {
        title: "Festivals & events",
        subtitle: "212 events in Somerset over the next 30 days",
        showSearchBar: false,
        filters: ["This month", "Next month", "This weekend", "Free", "Family", "Music", "Carnivals"],
      },
    },
    { type: "event_calendar", config: {} },
  ]);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
