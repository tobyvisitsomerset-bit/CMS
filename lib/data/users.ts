import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function listMembers() {
  return prisma.user.findMany({
    where: { role: { key: "MEMBER" } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}

export async function createMemberUser(input: { name: string; email: string; password: string }) {
  const role = await prisma.role.findUnique({ where: { key: "MEMBER" } });
  if (!role) throw new Error("MEMBER role not found — run prisma/seed.ts first.");

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw new Error("A user with that email already exists.");

  const passwordHash = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      roleId: role.id,
    },
    select: { id: true, name: true, email: true },
  });
}

export async function assignPageMember(pageId: string, memberId: string | null) {
  return prisma.page.update({
    where: { id: pageId },
    data: { assignedMemberId: memberId },
  });
}
