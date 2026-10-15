"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeAccountPasswordAction } from "./actions";

export function PasswordCard() {
  const [state, formAction, pending] = useActionState(changeAccountPasswordAction, undefined);
  return (
    <form action={formAction} className="rounded-3xl border border-stone-200 bg-white p-6">
      <h2 className="font-serif text-xl font-black">Change your password</h2>
      <div className="mt-4 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="current">Current password</Label>
          <Input id="current" name="current" type="password" required autoComplete="current-password" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="next">New password (at least 10 characters)</Label>
          <Input id="next" name="next" type="password" required minLength={10} autoComplete="new-password" />
        </div>
      </div>
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="mt-3 text-sm font-medium text-somerset-green">Password changed.</p>}
      <button type="submit" disabled={pending} className="mt-4 rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
