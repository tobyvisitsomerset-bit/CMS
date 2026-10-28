"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { importPhotoBatch, photoImportStatus, type PhotoImportProgress } from "@/lib/photo-import";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  return session;
}

export async function photoStatusAction(): Promise<PhotoImportProgress> {
  await requireStaff();
  return photoImportStatus();
}

export async function photoBatchAction(): Promise<PhotoImportProgress> {
  const session = await requireStaff();
  const progress = await importPhotoBatch(session.user.id, 10);
  updateTag("listings");
  revalidatePath("/cms/import-photos");
  return progress;
}

// Lets the pages the importer gave up on be tried again (for example after
// the old site had a hiccup).
export async function retryFailedPhotosAction(): Promise<PhotoImportProgress> {
  await requireStaff();
  await prisma.siteSetting.deleteMany({ where: { key: "photo-import-failed" } });
  return photoImportStatus();
}
