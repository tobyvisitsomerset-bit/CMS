// One-time migration fixup: the production database's listings were seeded
// before the Kentico facility reference data existed, so they have no
// facility connections. Clearing them lets prisma/seed.ts recreate them
// properly (its listing count guard only fires when the table is empty).
// Delete this file once run against production — see git history if needed again.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
prisma.listing
  .deleteMany()
  .then((r) => console.log(`Cleared ${r.count} listings for reseed.`))
  .finally(() => prisma.$disconnect());
