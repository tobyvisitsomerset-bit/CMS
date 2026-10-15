"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "../actions";

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(signUpAction, undefined);
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">Visit Somerset</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">Create your free account</h1>
      <p className="mt-2 text-stone-600">
        Save places, build trips and keep your itineraries, then pick them up on any device. We only use your details to run your account.
      </p>
      <form action={formAction} className="mt-6 space-y-4 rounded-3xl border border-stone-200 bg-white p-6">
        <div className="space-y-1.5">
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password (at least 10 characters)</Label>
          <Input id="password" name="password" type="password" required minLength={10} autoComplete="new-password" />
        </div>
        <label className="flex items-start gap-3 rounded-2xl bg-cool-grey p-3 text-sm text-stone-700">
          <input type="checkbox" name="club" className="mt-0.5 size-4 accent-[#3d685b]" />
          <span>
            <strong className="text-stone-900">Join the Somerset Club (optional)</strong>
            <span className="block text-xs text-stone-600">
              Ideas, events and offers from Visit Somerset by email, a few times a month. You can leave at any time from your account.
            </span>
          </span>
        </label>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-damson px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Creating your account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-somerset-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
