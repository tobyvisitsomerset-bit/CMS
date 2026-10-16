import { prisma } from "@/lib/prisma";
import { setCF, serializeCustomFields, type CustomField } from "@/lib/custom-fields";
import { LISTING_CLASS } from "@/lib/listing-marker";

// New listings, events and offers proposed by members. Nothing exists on the
// site until the team approves the submission; approval creates the page (or
// offer) and assigns it to the member who sent it.

export type SubmissionKind = "LISTING" | "EVENT" | "OFFER" | "NEWS";

import { LISTING_SECTIONS } from "@/lib/submission-meta";
export { LISTING_SECTIONS };

export type ListingData = {
  name: string;
  section: string;
  town: string;
  tagline: string;
  summary: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  address1: string;
  postcode: string;
  imageUrl: string;
};

export type EventData = {
  name: string;
  startDate: string;
  endDate: string;
  town: string;
  venue: string;
  summary: string;
  description: string;
  link: string;
  price: string;
  imageUrl: string;
};

export type OfferData = {
  pageId: string;
  title: string;
  description: string;
  url: string;
  validFrom: string;
  validTo: string;
};

export type NewsData = {
  title: string;
  releaseDate: string;
  summary: string;
  content: string;
  imageUrl: string;
};

export type SubmissionData = ListingData | EventData | OfferData | NewsData;

function clip(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function url(v: unknown): string {
  const s = clip(v, 500);
  return s && !/^(https?:\/\/|\/)/i.test(s) ? `https://${s}` : s;
}

function isoDate(v: unknown): string {
  const s = clip(v, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : "";
}

export function sanitiseListing(raw: unknown): ListingData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const section = clip(r.section, 10);
  return {
    name: clip(r.name, 120),
    section: LISTING_SECTIONS.some((s) => s.key === section) ? section : "do",
    town: clip(r.town, 80),
    tagline: clip(r.tagline, 300),
    summary: clip(r.summary, 2000),
    description: clip(r.description, 20000),
    phone: clip(r.phone, 40),
    email: clip(r.email, 254),
    website: url(r.website),
    address1: clip(r.address1, 120),
    postcode: clip(r.postcode, 12),
    imageUrl: clip(r.imageUrl, 500),
  };
}

export function sanitiseEvent(raw: unknown): EventData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    name: clip(r.name, 160),
    startDate: isoDate(r.startDate),
    endDate: isoDate(r.endDate),
    town: clip(r.town, 80),
    venue: clip(r.venue, 160),
    summary: clip(r.summary, 2000),
    description: clip(r.description, 20000),
    link: url(r.link),
    price: clip(r.price, 200),
    imageUrl: clip(r.imageUrl, 500),
  };
}

export function sanitiseOffer(raw: unknown): OfferData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    pageId: clip(r.pageId, 40),
    title: clip(r.title, 120),
    description: clip(r.description, 1000),
    url: url(r.url),
    validFrom: isoDate(r.validFrom),
    validTo: isoDate(r.validTo),
  };
}

export function sanitiseNews(raw: unknown): NewsData {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: clip(r.title, 160),
    releaseDate: isoDate(r.releaseDate),
    summary: clip(r.summary, 600),
    content: clip(r.content, 20000),
    imageUrl: clip(r.imageUrl, 500),
  };
}

export function sanitise(kind: SubmissionKind, raw: unknown): SubmissionData {
  return kind === "LISTING"
    ? sanitiseListing(raw)
    : kind === "EVENT"
      ? sanitiseEvent(raw)
      : kind === "NEWS"
        ? sanitiseNews(raw)
        : sanitiseOffer(raw);
}

export function titleOf(kind: SubmissionKind, data: SubmissionData): string {
  if (kind === "OFFER" || kind === "NEWS") return (data as OfferData | NewsData).title;
  return (data as ListingData | EventData).name;
}

/** What is missing before it can be sent for approval (empty = ready). */
export function problemsWith(kind: SubmissionKind, data: SubmissionData): string[] {
  const out: string[] = [];
  if (kind === "LISTING") {
    const d = data as ListingData;
    if (!d.name) out.push("Give the listing a name.");
    if (!d.summary && !d.description) out.push("Add a short summary or a description.");
    if (!d.town) out.push("Add the town.");
  } else if (kind === "EVENT") {
    const d = data as EventData;
    if (!d.name) out.push("Give the event a name.");
    if (!d.startDate) out.push("Add the start date.");
    if (d.endDate && d.endDate < d.startDate) out.push("The end date cannot be before the start date.");
    if (!d.summary && !d.description) out.push("Add a short description.");
  } else if (kind === "NEWS") {
    const d = data as NewsData;
    if (!d.title) out.push("Give the story a headline.");
    if (!d.releaseDate) out.push("Add the date of release.");
    if (!d.content) out.push("Add the story itself.");
  } else {
    const d = data as OfferData;
    if (!d.pageId) out.push("Choose which listing the offer is for.");
    if (!d.title) out.push("Give the offer a title.");
    if (d.validFrom && d.validTo && d.validTo < d.validFrom) out.push("The end date cannot be before the start date.");
  }
  return out;
}

export function parseData(kind: SubmissionKind, json: string): SubmissionData {
  try {
    return sanitise(kind, JSON.parse(json));
  } catch {
    return sanitise(kind, {});
  }
}

/** Label/value rows for the review screen. */
export function describe(kind: SubmissionKind, data: SubmissionData): { label: string; value: string }[] {
  const rows: [string, string][] = [];
  if (kind === "LISTING") {
    const d = data as ListingData;
    rows.push(
      ["Name", d.name],
      ["Section", LISTING_SECTIONS.find((s) => s.key === d.section)?.label ?? d.section],
      ["Town", d.town],
      ["Tagline", d.tagline],
      ["Summary", d.summary],
      ["Description", d.description],
      ["Phone", d.phone],
      ["Email", d.email],
      ["Website", d.website],
      ["Address", [d.address1, d.postcode].filter(Boolean).join(", ")],
      ["Photo", d.imageUrl ? "Yes" : ""],
    );
  } else if (kind === "EVENT") {
    const d = data as EventData;
    rows.push(
      ["Name", d.name],
      ["Starts", d.startDate],
      ["Ends", d.endDate],
      ["Town", d.town],
      ["Venue", d.venue],
      ["Summary", d.summary],
      ["Description", d.description],
      ["Tickets / more information", d.link],
      ["Price", d.price],
      ["Photo", d.imageUrl ? "Yes" : ""],
    );
  } else if (kind === "NEWS") {
    const d = data as NewsData;
    rows.push(
      ["Headline", d.title],
      ["Date of release", d.releaseDate],
      ["Summary", d.summary],
      ["Story", d.content],
      ["Photo", d.imageUrl ? "Yes" : ""],
      ["Will be filed under", d.releaseDate ? `News / ${monthTitle(d.releaseDate)}` : ""],
    );
  } else {
    const d = data as OfferData;
    rows.push(["Offer", d.title], ["Details", d.description], ["Link", d.url], ["From", d.validFrom], ["Until", d.validTo]);
  }
  return rows.filter(([, v]) => v).map(([label, value]) => ({ label, value }));
}

// ---- persistence -----------------------------------------------------------

export async function saveSubmission(input: {
  id?: string | null;
  kind: SubmissionKind;
  authorId: string;
  data: SubmissionData;
  submit: boolean;
}) {
  const payload = {
    title: titleOf(input.kind, input.data) || "Untitled",
    data: JSON.stringify(input.data),
    status: input.submit ? "SUBMITTED" : "DRAFT",
    note: null,
    submittedAt: input.submit ? new Date() : null,
  };
  if (input.id) {
    const existing = await prisma.submission.findFirst({
      where: { id: input.id, authorId: input.authorId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
    });
    if (!existing) throw new Error("Submission not found");
    return prisma.submission.update({ where: { id: existing.id }, data: payload });
  }
  return prisma.submission.create({ data: { kind: input.kind, authorId: input.authorId, ...payload } });
}

export async function deleteSubmission(id: string, authorId: string) {
  await prisma.submission.deleteMany({
    where: { id, authorId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
  });
}

// ---- approval --------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function uniqueSlug(prefix: string, title: string): Promise<string> {
  const base = `${prefix}/${slugify(title) || "listing"}`;
  let slug = base;
  for (let i = 2; await prisma.page.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
  return slug;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2026-10-16" -> "October 2026", the title of the month folder under News. */
function monthTitle(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function fieldValue(customFields: string | null, key: string): string | null {
  if (!customFields) return null;
  try {
    const rows = JSON.parse(customFields) as { key: string; value: string }[];
    return rows.find((r) => r.key === key)?.value ?? null;
  } catch {
    return null;
  }
}

/** Finds the month folder under News for the release date, creating it (newest first) if it is the first story that month. */
async function newsMonthFolder(releaseDate: string): Promise<{ id: string; slug: string }> {
  const news = await prisma.page.findUnique({ where: { slug: "news" }, select: { id: true, slug: true } });
  if (!news) throw new Error("The News section does not exist");
  const title = monthTitle(releaseDate);
  const existing = await prisma.page.findFirst({
    where: { parentId: news.id, title: { equals: title, mode: "insensitive" } },
    select: { id: true, slug: true },
  });
  if (existing) return existing;

  const start = `${releaseDate.slice(0, 7)}-01`;
  const months = await prisma.page.findMany({
    where: { parentId: news.id, customFields: { contains: "cms.blogmonth" } },
    select: { sortOrder: true, customFields: true },
    orderBy: { sortOrder: "asc" },
  });
  // Newest month first: slot in just before the first month that is older.
  const older = months.find((m) => (fieldValue(m.customFields, "BlogMonthStartingDate") ?? "").slice(0, 10) < start);
  const target = older ? older.sortOrder : (months.at(-1)?.sortOrder ?? 0) + 1;
  await prisma.page.updateMany({ where: { parentId: news.id, sortOrder: { gte: target } }, data: { sortOrder: { increment: 1 } } });

  let cf: CustomField[] = [];
  cf = setCF(cf, "BlogMonthName", title);
  cf = setCF(cf, "BlogMonthStartingDate", `${start}T00:00:00+00:00`);
  cf = setCF(cf, "_kenticoClassName", "cms.blogmonth");
  const folder = await prisma.page.create({
    data: {
      title,
      slug: await uniqueSlug(news.slug, title),
      parentId: news.id,
      isSection: true,
      status: "PUBLISHED",
      sortOrder: target,
      customFields: serializeCustomFields(cf),
    },
    select: { id: true, slug: true },
  });
  return folder;
}

async function createNewsPage(d: NewsData, authorId: string): Promise<string> {
  const folder = await newsMonthFolder(d.releaseDate);
  const first = await prisma.page.findFirst({ where: { parentId: folder.id }, orderBy: { sortOrder: "asc" }, select: { sortOrder: true } });
  let cf: CustomField[] = [];
  cf = setCF(cf, "BlogPostDate", `${d.releaseDate}T09:00:00+00:00`);
  cf = setCF(cf, "_kenticoClassName", "cms.blogpost");
  const page = await prisma.page.create({
    data: {
      title: d.title,
      slug: await uniqueSlug(folder.slug, d.title.slice(0, 60)),
      parentId: folder.id,
      status: "PUBLISHED",
      sortOrder: first ? first.sortOrder - 1 : 0,
      authorId,
      ownerId: authorId,
      assignedMemberId: authorId,
      subtitle: d.summary || null,
      bodyContent: d.content,
      heroImageUrl: d.imageUrl || null,
      customFields: serializeCustomFields(cf),
    },
  });
  return page.id;
}

function fieldsFor(entries: [string, string][]): string | null {
  // The marker is what makes the site list, search and map the page.
  let cf: CustomField[] = setCF([], "_kenticoClassName", LISTING_CLASS);
  for (const [k, v] of entries) if (v) cf = setCF(cf, k, v);
  return serializeCustomFields(cf);
}

/**
 * Creates what the submission describes. Returns the new page id (or the
 * listing the offer belongs to). The page is created PUBLISHED and assigned to
 * the member; the team can change membership level, parent folder or status
 * afterwards in the Content Hub.
 */
export async function createFromSubmission(
  kind: SubmissionKind,
  data: SubmissionData,
  authorId: string,
): Promise<string> {
  if (kind === "OFFER") {
    const d = data as OfferData;
    const page = await prisma.page.findFirst({ where: { id: d.pageId, assignedMemberId: authorId }, select: { id: true } });
    if (!page) throw new Error("The listing this offer is for is no longer assigned to this member");
    await prisma.offer.create({
      data: {
        pageId: page.id,
        title: d.title,
        description: d.description || null,
        url: d.url || null,
        validFrom: d.validFrom ? new Date(d.validFrom) : null,
        validTo: d.validTo ? new Date(d.validTo) : null,
      },
    });
    return page.id;
  }

  if (kind === "LISTING") {
    const d = data as ListingData;
    const section = LISTING_SECTIONS.find((s) => s.key === d.section) ?? LISTING_SECTIONS[1];
    const parent = await prisma.page.findUnique({ where: { slug: section.parentSlug }, select: { id: true, slug: true } });
    const siblings = await prisma.page.count({ where: { parentId: parent?.id ?? null } });
    const page = await prisma.page.create({
      data: {
        title: d.name,
        slug: await uniqueSlug(parent?.slug ?? section.parentSlug, d.name),
        parentId: parent?.id ?? null,
        status: "PUBLISHED",
        sortOrder: siblings,
        authorId,
        ownerId: authorId,
        assignedMemberId: authorId,
        tagline: d.tagline || null,
        subtitle: d.summary || null,
        bodyContent: d.description || null,
        heroImageUrl: d.imageUrl || null,
        customFields: fieldsFor([
          ["ItemTown", d.town],
          ["ItemPhone", d.phone],
          ["ItemEmail", d.email],
          ["ItemWeb", d.website],
          ["ItemAddress1", d.address1],
          ["ItemPostcode", d.postcode],
        ]),
      },
    });
    return page.id;
  }

  if (kind === "NEWS") return createNewsPage(data as NewsData, authorId);

  const d = data as EventData;
  const start = new Date(`${d.startDate}T12:00:00`);
  const month = start.toLocaleString("en-GB", { month: "long" });
  const folderTitle = `${month} ${start.getFullYear()}`;
  const root = await prisma.page.findUnique({ where: { slug: "festivals-events" }, select: { id: true, slug: true } });
  const folder = root
    ? await prisma.page.findFirst({ where: { parentId: root.id, title: { equals: folderTitle, mode: "insensitive" } }, select: { id: true, slug: true } })
    : null;
  const parent = folder ?? root;
  const siblings = await prisma.page.count({ where: { parentId: parent?.id ?? null } });
  const page = await prisma.page.create({
    data: {
      title: d.name,
      slug: await uniqueSlug(parent?.slug ?? "festivals-events", d.name),
      parentId: parent?.id ?? null,
      status: "PUBLISHED",
      sortOrder: siblings,
      authorId,
      ownerId: authorId,
      assignedMemberId: authorId,
      subtitle: d.summary || null,
      bodyContent: d.description || null,
      heroImageUrl: d.imageUrl || null,
      callToActionLabel: d.link ? "Tickets and information" : null,
      callToActionUrl: d.link || null,
      customFields: fieldsFor([
        ["ItemStartDate", d.startDate],
        ["ItemEndDate", d.endDate],
        ["ItemTown", d.town],
        ["ItemAddress1", d.venue],
        ["ItemWeb", d.link],
        ["ItemAdmission", d.price],
      ]),
    },
  });
  return page.id;
}
