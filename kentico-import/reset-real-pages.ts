import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.page.deleteMany({
    where: { customFields: { contains: "_kenticoNodeId" } },
  });
  console.log(`Deleted ${result.count} previously-imported Kentico pages.`);
}
main().finally(() => prisma.$disconnect());
