"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// A signed-in visitor's collections of saved places. A collection can be
// shared by an unlisted link; nobody else can see or change it otherwise.

async function me() {
  const session = await auth();
  if (!session?.user) throw new Error("Not signed in");
  return session.user.id;
}

export type CollectionSummary = { id: string; name: string; hasPage: boolean };

export async function listMyCollectionsAction(pageId?: string): Promise<CollectionSummary[]> {
  const session = await auth();
  if (!session?.user) return [];
  const rows = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { items: pageId ? { where: { pageId }, select: { id: true } } : { select: { id: true }, take: 0 } },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, hasPage: !!pageId && c.items.length > 0 }));
}

export async function createCollectionAction(name: string, pageId?: string): Promise<{ id: string; name: string }> {
  const userId = await me();
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Please give the collection a name.");
  const count = await prisma.collection.count({ where: { userId } });
  if (count >= 30) throw new Error("You have reached the limit of 30 collections.");
  const c = await prisma.collection.create({
    data: {
      userId,
      name: clean,
      token: randomBytes(9).toString("base64url"),
      ...(pageId ? { items: { create: { pageId } } } : {}),
    },
  });
  revalidatePath("/account/collections");
  return { id: c.id, name: c.name };
}

export async function toggleInCollectionAction(collectionId: string, pageId: string): Promise<{ added: boolean }> {
  const userId = await me();
  const c = await prisma.collection.findFirst({ where: { id: collectionId, userId }, select: { id: true } });
  if (!c) throw new Error("Collection not found");
  const page = await prisma.page.findFirst({ where: { id: pageId, status: "PUBLISHED" }, select: { id: true } });
  if (!page) throw new Error("Page not found");
  const existing = await prisma.collectionItem.findUnique({ where: { collectionId_pageId: { collectionId, pageId } } });
  if (existing) {
    await prisma.collectionItem.delete({ where: { id: existing.id } });
    await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
    revalidatePath("/account/collections");
    return { added: false };
  }
  const count = await prisma.collectionItem.count({ where: { collectionId } });
  if (count >= 100) throw new Error("A collection holds up to 100 places.");
  await prisma.collectionItem.create({ data: { collectionId, pageId } });
  await prisma.collection.update({ where: { id: collectionId }, data: { updatedAt: new Date() } });
  revalidatePath("/account/collections");
  return { added: true };
}

export async function renameCollectionAction(collectionId: string, name: string) {
  const userId = await me();
  const clean = name.trim().slice(0, 60);
  if (!clean) throw new Error("Please give the collection a name.");
  await prisma.collection.updateMany({ where: { id: collectionId, userId }, data: { name: clean } });
  revalidatePath("/account/collections");
}

export async function setCollectionSharedAction(collectionId: string, shared: boolean) {
  const userId = await me();
  await prisma.collection.updateMany({ where: { id: collectionId, userId }, data: { isShared: shared } });
  revalidatePath("/account/collections");
}

export async function deleteCollectionAction(collectionId: string) {
  const userId = await me();
  await prisma.collection.deleteMany({ where: { id: collectionId, userId } });
  revalidatePath("/account/collections");
}
