import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RoleKey } from "@/lib/permissions";

// Google and Microsoft sign-in switch on when their credentials are set in the
// environment (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET, and
// AUTH_MICROSOFT_ENTRA_ID_ID / _SECRET / _ISSUER). Nothing changes until then.
export const OAUTH_ENABLED = {
  google: !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
  microsoft: !!(process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET && process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER),
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true, // required behind Railway's (and most non-Vercel) reverse proxies
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { role: true },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl ?? undefined,
          roleKey: user.role.key as RoleKey,
          roleName: user.role.name,
        };
      },
    }),
    ...(OAUTH_ENABLED.google ? [Google] : []),
    ...(OAUTH_ENABLED.microsoft ? [MicrosoftEntraID] : []),
  ],
  callbacks: {
    // An OAuth sign-in becomes (or finds) a Visitor account with that email.
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        const role = await prisma.role.findUnique({ where: { key: "VISITOR" } });
        if (!role) return false;
        await prisma.user.create({
          data: {
            name: user.name ?? email.split("@")[0],
            email,
            passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 10),
            avatarUrl: user.image ?? null,
            roleId: role.id,
          },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user && account && account.provider !== "credentials" && user.email) {
        const row = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() }, include: { role: true } });
        if (row) {
          token.id = row.id;
          token.roleKey = row.role.key as RoleKey;
          token.roleName = row.role.name;
        }
        return token;
      }
      if (user) {
        token.id = user.id as string;
        token.roleKey = (user as { roleKey: RoleKey }).roleKey;
        token.roleName = (user as { roleName: string }).roleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleKey = token.roleKey as RoleKey;
        session.user.roleName = token.roleName as string;
      }
      return session;
    },
  },
});
