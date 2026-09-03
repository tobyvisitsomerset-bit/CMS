"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

const DEMO_ACCOUNTS = [
  { role: "Super Admin", email: "admin@visitsomerset.co.uk" },
  { role: "Content Admin", email: "content@visitsomerset.co.uk" },
  { role: "Member", email: "member@visitsomerset.co.uk" },
  { role: "Read Only", email: "viewer@visitsomerset.co.uk" },
];

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-800 text-white font-serif text-lg">
            VS
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Visit Somerset CMS</h1>
          <p className="text-sm text-neutral-500">Sign in to manage content</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@visitsomerset.co.uk" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="password123" />
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <div className="rounded-lg border border-dashed p-4 text-xs text-neutral-500">
          <p className="mb-2 font-medium text-neutral-700">Demo accounts (password: password123)</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email} className="flex justify-between gap-2">
                <span>{a.role}</span>
                <span className="font-mono">{a.email}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
