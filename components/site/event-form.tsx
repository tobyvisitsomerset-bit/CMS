"use client";

import { useActionState } from "react";
import { submitEventListingAction, type FormResult } from "@/app/(site)/actions";

const FIELD =
  "block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-somerset-green focus:outline-none";
const LABEL = "mb-1 block text-[11px] font-medium text-stone-500";

export function EventForm({ pageId }: { pageId: string }) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(submitEventListingAction, null);

  if (state?.ok) {
    return (
      <div className="rounded-3xl border border-somerset-green/30 bg-somerset-green/5 p-6">
        <p className="font-serif text-xl font-black text-stone-900">Thanks — event received</p>
        <p className="mt-1 text-sm text-stone-600">The team will review it and be in touch before it goes on the site.</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3 rounded-3xl border border-stone-200 bg-white p-5">
      <input type="hidden" name="pageId" value={pageId} />
      <label className="block">
        <span className={LABEL}>Event name</span>
        <input name="eventName" required className={FIELD} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL}>Date(s)</span>
          <input name="dates" placeholder="e.g. 14–16 June 2027" className={FIELD} />
        </label>
        <label className="block">
          <span className={LABEL}>Venue / town</span>
          <input name="venue" className={FIELD} />
        </label>
      </div>
      <label className="block">
        <span className={LABEL}>Website or ticket link</span>
        <input name="link" className={FIELD} />
      </label>
      <label className="block">
        <span className={LABEL}>Details</span>
        <textarea name="details" rows={3} className={FIELD} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={LABEL}>Your name</span>
          <input name="name" required className={FIELD} />
        </label>
        <label className="block">
          <span className={LABEL}>Email</span>
          <input name="email" type="email" required className={FIELD} />
        </label>
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-damson px-5 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Submit event"}
      </button>
    </form>
  );
}
