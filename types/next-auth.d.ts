import type { DefaultSession } from "next-auth";
import type { RoleKey } from "@/lib/permissions";
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleKey: RoleKey;
      roleName: string;
    } & DefaultSession["user"];
  }

  interface User {
    roleKey: RoleKey;
    roleName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleKey: RoleKey;
    roleName: string;
  }
}
