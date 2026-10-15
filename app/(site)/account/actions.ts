"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type FormState = { error?: string; ok?: boolean } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(formData.get("password") ?? "");
  if (!name) return { error: "Please tell us your name." };
  if (!EMAIL.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 10) return { error: "Use at least 10 characters for your password." };

  const role = await prisma.role.findUnique({ where: { key: "VISITOR" } });
  if (!role) return { error: "Accounts are not available right now. Please try again shortly." };
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: "There is already an account with that email. Try signing in." };

  await prisma.user.create({
    data: { name, email, passwordHash: await bcrypt.hash(password, 12), roleId: role.id },
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/account" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Your account was created. Please sign in." };
    throw e; // the redirect
  }
  return { ok: true };
}

// Itineraries saved before signing in are attached to the account.
export async function claimItinerariesAction(tokens: string[]): Promise<{ claimed: number }> {
  const session = await auth();
  if (!session?.user) return { claimed: 0 };
  const clean = tokens.filter((t) => typeof t === "string" && t.length < 40).slice(0, 30);
  if (clean.length === 0) return { claimed: 0 };
  const res = await prisma.itinerary.updateMany({ where: { token: { in: clean }, userId: null }, data: { userId: session.user.id } });
  return { claimed: res.count };
}

export async function changeAccountPasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "Please sign in again." };
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 10) return { error: "Use at least 10 characters for the new password." };
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user || !(await bcrypt.compare(current, user.passwordHash))) return { error: "Your current password is not right." };
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return { ok: true };
}
