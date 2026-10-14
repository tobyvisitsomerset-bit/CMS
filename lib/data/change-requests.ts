import { prisma } from "@/lib/prisma";
import { parseCustomFieldsArray, serializeCustomFields, setCF, type CustomField } from "@/lib/custom-fields";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";

// Member edits never touch the live page. They are stored as a ChangeRequest
// and only applied when a member of the team approves them. This file owns the
// shape of a proposal and how it is applied.

export type ProposalRoom = {
  name: string;
  description: string;
  imageUrl: string;
  priceLabel: string;
  features: string;
  bookingUrl: string;
};

export type Proposal = {
  tagline: string;
  subtitle: string;
  bodyContent: string;
  heroImageUrl: string;
  gallery: string[];
  phone: string;
  email: string;
  website: string;
  bookingUrl: string;
  bookingLabel: string;
  address1: string;
  address2: string;
  town: string;
  postcode: string;
  openingTimes: string;
  admission: string;
  facebook: string;
  twitter: string;
  instagram: string;
  rooms: ProposalRoom[];
};

// Which customFields key each proposal field is stored under.
const INFO_KEYS: Record<string, keyof Proposal> = {
  ItemPhone: "phone",
  ItemEmail: "email",
  ItemWeb: "website",
  ItemBookingWeb: "bookingUrl",
  ItemBookingWebButtonText: "bookingLabel",
  ItemAddress1: "address1",
  ItemAddress2: "address2",
  ItemTown: "town",
  ItemPostcode: "postcode",
  ItemOpeningTimes: "openingTimes",
  ItemAdmission: "admission",
  ItemFacebook: "facebook",
  ItemTwitter: "twitter",
  ItemInstagram: "instagram",
};

export const FIELD_LABELS: Record<keyof Proposal, string> = {
  tagline: "Tagline",
  subtitle: "Summary",
  bodyContent: "Description",
  heroImageUrl: "Main photo",
  gallery: "Gallery photos",
  phone: "Phone",
  email: "Email",
  website: "Website",
  bookingUrl: "Booking link",
  bookingLabel: "Booking button text",
  address1: "Address line 1",
  address2: "Address line 2",
  town: "Town",
  postcode: "Postcode",
  openingTimes: "Opening times",
  admission: "Prices / admission",
  facebook: "Facebook",
  twitter: "Twitter / X",
  instagram: "Instagram",
  rooms: "Rooms",
};

type PageForProposal = {
  tagline: string | null;
  subtitle: string | null;
  bodyContent: string | null;
  heroImageUrl: string | null;
  galleryUrls: string | null;
  customFields: string | null;
  rooms: { name: string; description: string | null; imageUrl: string | null; priceLabel: string | null; features: string | null; bookingUrl: string | null }[];
};

function plain(v: string | null | undefined): string {
  // Rich-text fields from Kentico come as HTML — members edit plain text.
  return v ? (decodeKenticoText(v) ?? "") : "";
}

// The current, live values of everything a member may edit.
export function proposalFromPage(page: PageForProposal): Proposal {
  const fields = parseCustomFields(page.customFields);
  const info = getBusinessInfo(fields);
  let gallery: string[] = [];
  try {
    const g = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
    gallery = Array.isArray(g) ? g : [];
  } catch {
    gallery = [];
  }
  const p = {
    tagline: page.tagline ?? "",
    subtitle: plain(page.subtitle),
    bodyContent: page.bodyContent ?? "",
    heroImageUrl: page.heroImageUrl ?? "",
    gallery,
    phone: fields.ItemPhone ?? "",
    email: fields.ItemEmail ?? "",
    website: fields.ItemWeb ?? "",
    bookingUrl: fields.ItemBookingWeb ?? "",
    bookingLabel: fields.ItemBookingWebButtonText ?? "",
    address1: fields.ItemAddress1 ?? "",
    address2: fields.ItemAddress2 ?? "",
    town: info?.town ?? fields.ItemTown ?? "",
    postcode: fields.ItemPostcode ?? "",
    openingTimes: plain(fields.ItemOpeningTimes),
    admission: plain(fields.ItemAdmission),
    facebook: fields.ItemFacebook ?? "",
    twitter: fields.ItemTwitter ?? "",
    instagram: fields.ItemInstagram ?? "",
    rooms: page.rooms.map((r) => {
      let features = "";
      try {
        const arr = r.features ? JSON.parse(r.features) : [];
        features = Array.isArray(arr) ? arr.join(", ") : "";
      } catch {
        features = "";
      }
      return {
        name: r.name,
        description: r.description ?? "",
        imageUrl: r.imageUrl ?? "",
        priceLabel: r.priceLabel ?? "",
        features,
        bookingUrl: r.bookingUrl ?? "",
      };
    }),
  } satisfies Proposal;
  return p;
}

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Never trust a client-supplied proposal: pick known fields only, bound lengths.
export function sanitiseProposal(raw: unknown): Proposal {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Proposal, unknown>>;
  const url = (v: unknown) => {
    const s = clip(v, 500);
    return s && !/^(https?:\/\/|\/)/i.test(s) ? `https://${s}` : s;
  };
  const rooms = Array.isArray(r.rooms) ? (r.rooms as Partial<ProposalRoom>[]).slice(0, 30) : [];
  return {
    tagline: clip(r.tagline, 300),
    subtitle: clip(r.subtitle, 2000),
    bodyContent: clip(r.bodyContent, 20000),
    heroImageUrl: clip(r.heroImageUrl, 500),
    gallery: Array.isArray(r.gallery) ? (r.gallery as unknown[]).map((g) => clip(g, 500)).filter(Boolean).slice(0, 24) : [],
    phone: clip(r.phone, 40),
    email: clip(r.email, 254),
    website: url(r.website),
    bookingUrl: url(r.bookingUrl),
    bookingLabel: clip(r.bookingLabel, 40),
    address1: clip(r.address1, 120),
    address2: clip(r.address2, 120),
    town: clip(r.town, 80),
    postcode: clip(r.postcode, 12),
    openingTimes: clip(r.openingTimes, 4000),
    admission: clip(r.admission, 4000),
    facebook: clip(r.facebook, 200),
    twitter: clip(r.twitter, 200),
    instagram: clip(r.instagram, 200),
    rooms: rooms
      .filter((room) => clip(room.name, 120))
      .map((room) => ({
        name: clip(room.name, 120),
        description: clip(room.description, 600),
        imageUrl: clip(room.imageUrl, 500),
        priceLabel: clip(room.priceLabel, 60),
        features: clip(room.features, 300),
        bookingUrl: url(room.bookingUrl),
      })),
  };
}

// Sanitising trims whitespace; keep the live value when that is the only
// difference so an untouched field never shows up as a change.
export function keepUnchanged(proposal: Proposal, live: Proposal): Proposal {
  const out = { ...proposal } as Record<string, unknown>;
  (Object.keys(live) as (keyof Proposal)[]).forEach((k) => {
    const l = live[k];
    if (typeof l === "string" && l.trim() === proposal[k]) out[k] = l;
  });
  return out as Proposal;
}

export function parseProposal(json: string): Proposal | null {
  try {
    return sanitiseProposal(JSON.parse(json));
  } catch {
    return null;
  }
}

export type FieldChange = { key: keyof Proposal; label: string; before: string; after: string };

function show(key: keyof Proposal, p: Proposal): string {
  if (key === "gallery") return p.gallery.length ? `${p.gallery.length} photo${p.gallery.length === 1 ? "" : "s"}` : "none";
  if (key === "rooms") return p.rooms.length ? p.rooms.map((r) => `${r.name}${r.priceLabel ? ` (${r.priceLabel})` : ""}`).join("; ") : "none";
  const v = p[key] as string;
  return v || "—";
}

export function diffProposal(before: Proposal, after: Proposal): FieldChange[] {
  const changes: FieldChange[] = [];
  (Object.keys(FIELD_LABELS) as (keyof Proposal)[]).forEach((key) => {
    const a = JSON.stringify(before[key]);
    const b = JSON.stringify(after[key]);
    if (a !== b) changes.push({ key, label: FIELD_LABELS[key], before: show(key, before), after: show(key, after) });
  });
  return changes;
}

// ---- persistence -----------------------------------------------------------

export async function getActiveRequest(pageId: string, authorId: string) {
  return prisma.changeRequest.findFirst({
    where: { pageId, authorId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function saveRequest(pageId: string, authorId: string, proposal: Proposal, submit: boolean) {
  const existing = await prisma.changeRequest.findFirst({
    where: { pageId, authorId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
  });
  const data = {
    proposal: JSON.stringify(proposal),
    status: submit ? "SUBMITTED" : "DRAFT",
    note: null,
    submittedAt: submit ? new Date() : null,
  };
  if (existing) return prisma.changeRequest.update({ where: { id: existing.id }, data });
  return prisma.changeRequest.create({ data: { pageId, authorId, ...data } });
}

export async function withdrawRequest(pageId: string, authorId: string) {
  await prisma.changeRequest.deleteMany({ where: { pageId, authorId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } } });
}

// Apply an approved proposal to the live page. Only fields the member
// actually changed are written, so untouched rich text (e.g. opening times
// authored in Kentico) is never flattened by an unrelated edit.
export async function applyProposal(pageId: string, proposal: Proposal) {
  const page = await prisma.page.findUnique({ where: { id: pageId }, include: { rooms: { orderBy: { sortOrder: "asc" } } } });
  if (!page) throw new Error("Page not found");
  const before = proposalFromPage(page);
  const changed = (key: keyof Proposal) => JSON.stringify(before[key]) !== JSON.stringify(proposal[key]);

  let cf: CustomField[] = parseCustomFieldsArray(page.customFields);
  for (const [cfKey, field] of Object.entries(INFO_KEYS)) {
    if (!changed(field)) continue;
    const value = proposal[field] as string;
    if (cf.some((f) => f.key === cfKey)) cf = cf.map((f) => (f.key === cfKey ? { ...f, value } : f));
    else cf = setCF(cf, cfKey, value);
  }

  const data: Record<string, unknown> = { customFields: serializeCustomFields(cf) };
  if (changed("tagline")) data.tagline = proposal.tagline || null;
  if (changed("subtitle")) data.subtitle = proposal.subtitle || null;
  if (changed("bodyContent")) data.bodyContent = proposal.bodyContent || null;
  if (changed("heroImageUrl")) data.heroImageUrl = proposal.heroImageUrl || null;
  if (changed("gallery")) data.galleryUrls = proposal.gallery.length ? JSON.stringify(proposal.gallery) : null;

  const ops = [prisma.page.update({ where: { id: pageId }, data })];
  if (changed("rooms")) {
    ops.push(
      prisma.room.deleteMany({ where: { pageId } }) as never,
      prisma.room.createMany({
        data: proposal.rooms.map((r, i) => ({
          pageId,
          name: r.name,
          description: r.description || null,
          imageUrl: r.imageUrl || null,
          priceLabel: r.priceLabel || null,
          bookingUrl: r.bookingUrl || null,
          features: r.features
            ? JSON.stringify(
                r.features
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
              )
            : null,
          sortOrder: i,
        })),
      }) as never,
    );
  }
  await prisma.$transaction(ops);
}
