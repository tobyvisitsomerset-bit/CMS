"use server";

import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hasCapability } from "@/lib/permissions";
import { emailConfigured, sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates";
import { notifyAssignment } from "@/lib/data/notifications";

// Staff create accounts here: a member (with the pages they look after) or a
// team member. The team never has to invent a password: one is generated and
// shown once, and can be emailed to the person with their sign-in link.

const STAFF_ROLES = ["SUPER_ADMIN", "CONTENT_ADMIN", "READ_ONLY"];
const ALLOWED_ROLES = ["MEMBER", ...STAFF_ROLES];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// No look-alike characters (0/O, 1/l/I) so it can be read out over the phone.
function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 14 }, () => chars[randomInt(chars.length)]).join("");
}

async function requireUserManager() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  if (!hasCapability(session.user.roleKey, "members.manage")) throw new Error("Not permitted");
  return session;
}

export type CreateUserResult =
  | { ok: true; id: string; email: string; password: string; emailed: "sent" | "not-configured" | "failed" | "skipped" }
  | { ok: false; error: string };

export async function createUserAction(input: {
  name: string;
  email: string;
  roleKey: string;
  password?: string;
  pageIds?: string[];
  sendEmail?: boolean;
}): Promise<CreateUserResult> {
  const session = await requireUserManager();
  const name = input.name.trim().slice(0, 80);
  const email = input.email.trim().toLowerCase().slice(0, 254);
  if (!name) return { ok: false, error: "Please enter a name." };
  if (!EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!ALLOWED_ROLES.includes(input.roleKey)) return { ok: false, error: "Choose a role." };
  // Only a Super Admin can create team accounts.
  if (STAFF_ROLES.includes(input.roleKey) && session.user.roleKey !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a Super Admin can create team accounts." };
  }
  const password = (input.password ?? "").trim() || generatePassword();
  if (password.length < 10) return { ok: false, error: "The password needs at least 10 characters." };

  const [role, existing] = await Promise.all([
    prisma.role.findUnique({ where: { key: input.roleKey } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
  ]);
  if (!role) return { ok: false, error: "That role is not set up." };
  if (existing) return { ok: false, error: "There is already an account with that email." };

  const user = await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), roleId: role.id, mustChangePassword: true },
  });

  let pageTitles: string[] = [];
  if (input.roleKey === "MEMBER" && input.pageIds?.length) {
    const pages = await prisma.page.findMany({ where: { id: { in: input.pageIds.slice(0, 50) }, linkedPageId: null }, select: { id: true, title: true } });
    await prisma.page.updateMany({ where: { id: { in: pages.map((p) => p.id) } }, data: { assignedMemberId: user.id } });
    for (const p of pages) await notifyAssignment(user.id, p.title, p.id);
    pageTitles = pages.map((p) => p.title);
  }

  await logAudit({
    userId: session.user.id,
    action: "created",
    details: `Created ${role.name} account: ${name} (${email})${pageTitles.length ? `, assigned ${pageTitles.length} page(s)` : ""}`,
  });

  let emailed: "sent" | "not-configured" | "failed" | "skipped" = "skipped";
  if (input.sendEmail) {
    if (!emailConfigured()) emailed = "not-configured";
    else {
      const res = await sendEmail(welcomeEmail({ name, email, password, roleKey: input.roleKey, pageTitles }));
      emailed = res.ok ? "sent" : "failed";
    }
  }
  revalidatePath("/cms/users");
  revalidatePath("/cms");
  return { ok: true, id: user.id, email, password, emailed };
}

export async function resetUserPasswordAction(userId: string, send: boolean): Promise<CreateUserResult> {
  const session = await requireUserManager();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true, assignedPages: { select: { title: true } } } });
  if (!user) return { ok: false, error: "User not found." };
  if (STAFF_ROLES.includes(user.role.key) && session.user.roleKey !== "SUPER_ADMIN") {
    return { ok: false, error: "Only a Super Admin can reset a team account." };
  }
  if (user.role.key === "VISITOR") return { ok: false, error: "Visitors reset their own passwords." };

  const password = generatePassword();
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 12), mustChangePassword: true } });
  await logAudit({ userId: session.user.id, action: "updated", details: `Reset password for ${user.email}` });

  let emailed: "sent" | "not-configured" | "failed" | "skipped" = "skipped";
  if (send) {
    if (!emailConfigured()) emailed = "not-configured";
    else {
      const res = await sendEmail(
        welcomeEmail({ name: user.name, email: user.email, password, roleKey: user.role.key, pageTitles: user.assignedPages.map((p) => p.title) }),
      );
      emailed = res.ok ? "sent" : "failed";
    }
  }
  revalidatePath("/cms/users");
  return { ok: true, id: user.id, email: user.email, password, emailed };
}

export async function assignPagesToMemberAction(userId: string, pageIds: string[]) {
  const session = await requireUserManager();
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || user.role.key !== "MEMBER") throw new Error("Pages can only be assigned to member accounts.");
  const pages = await prisma.page.findMany({ where: { id: { in: pageIds.slice(0, 50) }, linkedPageId: null }, select: { id: true, title: true, assignedMemberId: true } });
  await prisma.page.updateMany({ where: { id: { in: pages.map((p) => p.id) } }, data: { assignedMemberId: userId } });
  for (const p of pages.filter((x) => x.assignedMemberId !== userId)) await notifyAssignment(userId, p.title, p.id);
  await logAudit({ userId: session.user.id, action: "updated", details: `Assigned ${pages.length} page(s) to ${user.email}` });
  revalidatePath("/cms/users");
  return { assigned: pages.length };
}

export async function unassignPageAction(pageId: string) {
  const session = await requireUserManager();
  await prisma.page.update({ where: { id: pageId }, data: { assignedMemberId: null } });
  await logAudit({ userId: session.user.id, pageId, action: "updated", details: "Unassigned member" });
  revalidatePath("/cms/users");
}
