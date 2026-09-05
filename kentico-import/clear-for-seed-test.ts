// Application-level clear (not a schema reset) so the full seed.ts flow can
// be validated end-to-end against local dev data as if starting fresh.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.version.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.page.deleteMany();
  await prisma.media.deleteMany();
  await prisma.mediaFolder.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.facilityGroup.deleteMany();
  await prisma.location.deleteMany();
  await prisma.membershipTierDefinition.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  console.log("Cleared all app tables (local dev DB) for a fresh seed test.");
}

main().finally(() => prisma.$disconnect());
