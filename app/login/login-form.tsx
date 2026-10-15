"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { loginAction, oauthAction } from "./actions";

export function LoginForm({ oauth }: { oauth: { google: boolean; microsoft: boolean } }) {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-emerald-800 text-white font-serif text-lg">
            VS
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Sign in to Visit Somerset</h1>
          <p className="text-sm text-neutral-500">Visitors: your saved trips. Members: your listings. Staff: the Content Hub.</p>
        </div>

        <form action={formAction} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@visitsomerset.co.uk" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required autoComplete="current-password" placeholder="Your password" />
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {(oauth.google || oauth.microsoft) && (
          <div className="space-y-2">
            {oauth.google && (
              <form action={oauthAction.bind(null, "google")}>
                <Button type="submit" variant="outline" className="w-full">
                  Continue with Google
                </Button>
              </form>
            )}
            {oauth.microsoft && (
              <form action={oauthAction.bind(null, "microsoft-entra-id")}>
                <Button type="submit" variant="outline" className="w-full">
                  Continue with Microsoft
                </Button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-sm text-neutral-600">
          New to Visit Somerset?{" "}
          <Link href="/account/sign-up" className="font-semibold text-emerald-800 hover:underline">
            Create a free account
          </Link>{" "}
          to save trips and itineraries.
        </p>
      </div>
    </div>
  );
}
