"use client";

import { useActionState } from "react";
import { submitBookingRequestAction, type FormResult } from "@/app/(site)/actions";

const FIELD = "block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:border-somerset-green focus:outline-none";
const LABEL = "mb-1 block text-[11px] font-medium text-stone-500";

// The enquiry form that sits in the sticky rail of a listing page. It stores a
// real BookingRequest (listed in the CMS) — it is an enquiry, not a booking,
// and the copy says so.
export function EnquiryForm({
  pageId,
  title,
  withDates,
  defaults,
  priceLine,
  readOnly,
}: {
  pageId: string;
  title: string;
  withDates: boolean;
  defaults: { checkIn?: string; checkOut?: string; guests?: string };
  priceLine?: { amount: string; unit: string | null } | null;
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(submitBookingRequestAction, null);

  if (state?.ok) {
    return (
      <div className="rounded-3xl border border-somerset-green/30 bg-somerset-green/5 p-6">
        <p className="font-serif text-xl font-black text-stone-900">Enquiry sent</p>
        <p className="mt-1 text-sm text-stone-600">
          Thanks — we&apos;ve got your enquiry for {title} and will pass it on. Availability and price are confirmed by the business directly.
        </p>
      </div>
    );
  }

  return (
    <form action={action} id="enquire" className="scroll-mt-32 space-y-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.15)]">
      <input type="hidden" name="pageId" value={pageId} />
      <div>
        {priceLine ? (
          <p className="font-serif text-2xl font-black text-stone-900">
            <span className="mr-1 font-sans text-xs font-medium text-stone-500">from</span>
            {priceLine.amount}
            {priceLine.unit && <span className="ml-1 font-sans text-xs font-medium text-stone-500">{priceLine.unit}</span>}
          </p>
        ) : (
          <p className="font-serif text-xl font-black text-stone-900">{withDates ? "Check availability" : "Make an enquiry"}</p>
        )}
      </div>

      {withDates && (
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className={LABEL}>Check in</span>
            <input type="date" name="checkIn" defaultValue={defaults.checkIn} className={FIELD} />
          </label>
          <label>
            <span className={LABEL}>Check out</span>
            <input type="date" name="checkOut" defaultValue={defaults.checkOut} className={FIELD} />
          </label>
          <label className="col-span-2">
            <span className={LABEL}>Guests</span>
            <input type="text" name="guests" defaultValue={defaults.guests} placeholder="2 adults" className={FIELD} />
          </label>
        </div>
      )}

      <label className="block">
        <span className={LABEL}>Your name</span>
        <input type="text" name="name" required className={FIELD} />
      </label>
      <label className="block">
        <span className={LABEL}>Email</span>
        <input type="email" name="email" required className={FIELD} />
      </label>
      <label className="block">
        <span className={LABEL}>Phone (optional)</span>
        <input type="tel" name="phone" className={FIELD} />
      </label>
      <label className="block">
        <span className={LABEL}>Message (optional)</span>
        <textarea name="message" rows={3} className={FIELD} />
      </label>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || readOnly}
        className="w-full rounded-full bg-damson px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {readOnly ? "Enquiries are disabled in preview" : pending ? "Sending…" : "Send enquiry"}
      </button>
      <p className="text-center text-xs text-stone-500">
        This is an enquiry, not a booking. The business confirms availability and price with you directly.
      </p>
    </form>
  );
}
