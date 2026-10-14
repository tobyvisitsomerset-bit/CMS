"use server";

import { prisma } from "@/lib/prisma";

export type FormResult = { ok: true } | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

// Real signup — stored in NewsletterSubscriber and listed in the CMS
// (/cms/enquiries). No email is sent from here: there is no ESP wired up, so
// the list is exported/imported into whichever tool the team chooses.
export async function subscribeNewsletterAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const email = clean(formData.get("email"), 254).toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  const source = clean(formData.get("source"), 40) || "footer";
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email, source },
    update: {},
  });
  return { ok: true };
}

// A stay enquiry for one real listing. Stored for the team / the business to
// pick up — it is a request, not a confirmed booking.
export async function submitBookingRequestAction(_prev: FormResult | null, formData: FormData): Promise<FormResult> {
  const pageId = clean(formData.get("pageId"), 40);
  const name = clean(formData.get("name"), 120);
  const email = clean(formData.get("email"), 254).toLowerCase();
  if (!pageId) return { ok: false, error: "Missing listing." };
  if (!name) return { ok: false, error: "Please tell us your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const page = await prisma.page.findFirst({
    where: { id: pageId, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true },
  });
  if (!page) return { ok: false, error: "That listing is no longer available." };

  await prisma.bookingRequest.create({
    data: {
      pageId: page.id,
      pageTitle: page.title,
      pageSlug: page.slug,
      name,
      email,
      phone: clean(formData.get("phone"), 40) || null,
      checkIn: clean(formData.get("checkIn"), 20) || null,
      checkOut: clean(formData.get("checkOut"), 20) || null,
      guests: clean(formData.get("guests"), 60) || null,
      message: clean(formData.get("message"), 2000) || null,
    },
  });
  return { ok: true };
}
