import { prisma } from "@/lib/prisma";

export async function getFolderTree() {
  const folders = await prisma.mediaFolder.findMany({ orderBy: { name: "asc" } });
  type FolderNode = (typeof folders)[number] & { children: FolderNode[] };
  const byId = new Map<string, FolderNode>();
  folders.forEach((f) => byId.set(f.id, { ...f, children: [] }));
  const roots: FolderNode[] = [];
  for (const f of folders) {
    const node = byId.get(f.id)!;
    if (f.parentId && byId.has(f.parentId)) byId.get(f.parentId)!.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function listMedia(params: { folderId?: string | null; search?: string }) {
  return prisma.media.findMany({
    where: {
      folderId: params.folderId === undefined ? undefined : params.folderId,
      ...(params.search
        ? {
            OR: [
              { filename: { contains: params.search, mode: "insensitive" } },
              { tagsCsv: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecentMedia(take = 12) {
  return prisma.media.findMany({ orderBy: { createdAt: "desc" }, take });
}

/** Naive "used by" lookup: string-matches the media URL against page fields and block configs. */
export async function getMediaUsage(url: string) {
  const [pages, blocks] = await Promise.all([
    prisma.page.findMany({
      where: {
        OR: [{ heroImageUrl: url }, { galleryUrls: { contains: url } }, { socialShareImage: url }],
      },
      select: { id: true, title: true },
    }),
    prisma.contentBlock.findMany({
      where: { config: { contains: url } },
      select: { id: true, pageId: true, page: { select: { title: true } } },
    }),
  ]);
  const pageMap = new Map(pages.map((p) => [p.id, p.title]));
  for (const b of blocks) pageMap.set(b.pageId, b.page.title);
  return Array.from(pageMap.entries()).map(([id, title]) => ({ id, title }));
}

export async function createFolder(name: string, parentId: string | null) {
  return prisma.mediaFolder.create({ data: { name, parentId } });
}

export async function deleteMedia(id: string) {
  return prisma.media.delete({ where: { id } });
}

export async function moveMedia(id: string, folderId: string | null) {
  return prisma.media.update({ where: { id }, data: { folderId } });
}

export async function getUnusedMedia() {
  const [allMedia, pages, blocks] = await Promise.all([
    prisma.media.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.page.findMany({
      select: { heroImageUrl: true, galleryUrls: true, socialShareImage: true },
    }),
    prisma.contentBlock.findMany({ select: { config: true } }),
  ]);

  const referencedText = [
    ...pages.map((p) => `${p.heroImageUrl ?? ""} ${p.galleryUrls ?? ""} ${p.socialShareImage ?? ""}`),
    ...blocks.map((b) => b.config),
  ].join(" ");

  return allMedia.filter((m) => !referencedText.includes(m.url));
}

export function kindFromMimeType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  return "document";
}
