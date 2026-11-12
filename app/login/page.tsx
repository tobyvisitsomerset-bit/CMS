import type { Metadata } from "next";
import { OAUTH_ENABLED } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in to Visit Somerset" };

export default function LoginPage() {
  return <LoginForm oauth={OAUTH_ENABLED} />;
}
