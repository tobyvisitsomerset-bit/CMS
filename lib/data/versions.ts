import { prisma } from "@/lib/prisma";
import type { Page, ContentBlock } from "@prisma/client";

export type PageSnapshot = {
  page: Omit<Page, "createdAt" | "updatedAt" | "publishDate" | "expiryDate" | "archivedAt"> & {
    createdAt: string;
    updatedAt: string;
  };
  contentBlocks: Pick<ContentBlock, "type" | "sortOrder" | "config">[];
};

export async function createVersionSnapshot(pageId: string, editorId: string | undefined, changeSummary?: string) {
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    include: { contentBlocks: { orderBy: { sortOrder: "asc" } } },
  });
  if (!page) return null;

  const lastVersion = await prisma.version.findFirst({
    where: { pageId },
    orderBy: { versionNumber: "desc" },
  });

  const snapshot: PageSnapshot = {
    page: { ...page, createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString() },
    contentBlocks: page.contentBlocks.map((b) => ({ type: b.type, sortOrder: b.sortOrder, config: b.config })),
  };

  return prisma.version.create({
    data: {
      pageId,
      versionNumber: (lastVersion?.versionNumber ?? 0) + 1,
      editorId,
      snapshot: JSON.stringify(snapshot),
      changeSummary,
    },
  });
}

export async function listVersions(pageId: string) {
  return prisma.version.findMany({
    where: { pageId },
    include: { editor: { select: { name: true } } },
    orderBy: { versionNumber: "desc" },
  });
}

export async function getVersion(id: string) {
  return prisma.version.findUnique({ where: { id }, include: { editor: { select: { name: true } } } });
}

export async function rollbackToVersion(versionId: string, editorId?: string) {
  const version = await prisma.version.findUnique({ where: { id: versionId } });
  if (!version) throw new Error("Version not found");

  // Snapshot the pre-rollback state so rolling back is itself reversible.
  await createVersionSnapshot(version.pageId, editorId, `Before rollback to version ${version.versionNumber}`);

  const snapshot: PageSnapshot = JSON.parse(version.snapshot);

  const { id: _id, createdAt: _c, updatedAt: _u, ...pageFields } = snapshot.page;
  void _id;
  void _c;
  void _u;

  await prisma.$transaction([
    prisma.page.update({ where: { id: version.pageId }, data: pageFields }),
    prisma.contentBlock.deleteMany({ where: { pageId: version.pageId } }),
    prisma.contentBlock.createMany({
      data: snapshot.contentBlocks.map((b) => ({ ...b, pageId: version.pageId })),
    }),
  ]);

  await createVersionSnapshot(version.pageId, editorId, `Rolled back to version ${version.versionNumber}`);

  return prisma.page.findUnique({ where: { id: version.pageId } });
}
