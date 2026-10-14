"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type FormResult } from "@/app/(site)/actions";

export function NewsletterForm({ source = "footer", tone = "dark" }: { source?: string; tone?: "dark" | "light" }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(subscribeNewsletterAction, null);

  if (state?.ok) {
    return (
      <p className={tone === "dark" ? "text-sm font-medium text-white" : "text-sm font-medium text-somerset-green"}>
        Thanks — you&apos;re on the list.
      </p>
    );
  }

  return (
    <form action={action} className="w-full max-w-md">
      <input type="hidden" name="source" value={source} />
      <div className="flex gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Email address
        </label>
        <input
          id={`newsletter-${source}`}
          type="email"
          name="email"
          required
          placeholder="Your email address"
          className="min-w-0 flex-1 rounded-full border border-white/20 bg-white px-4 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-white/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Joining…" : "Subscribe"}
        </button>
      </div>
      {state && !state.ok && <p className="mt-2 text-xs text-red-200">{state.error}</p>}
    </form>
  );
}
