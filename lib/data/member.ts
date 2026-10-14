import { prisma } from "@/lib/prisma";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";

// Everything the Member Portal shows is read from the same database as the
// Content Hub and public site. Nothing here is estimated or invented: counts
// are real rows, and "listing strength" is a transparent checklist over real
// fields.

const TIER_LABEL: Record<string, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold", PLATINUM: "Platinum" };

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Awaiting approval",
  PUBLISHED: "Live",
  ARCHIVED: "Archived",
};

export type StrengthItem = { label: string; done: boolean; hint: string };

export type MemberListing = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";
  statusLabel: string;
  tierLabel: string | null;
  heroImageUrl: string | null;
  town: string | null;
  summary: string | null;
  strength: { score: number; items: StrengthItem[] };
  enquiryCount: number;
  newEnquiryCount: number;
  /** State of this member's own pending edit, if any. */
  change: "DRAFT" | "SUBMITTED" | "REJECTED" | null;
};

export type MemberEnquiry = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  name: string;
  email: string;
  phone: string | null;
  checkIn: string | null;
  checkOut: string | null;
  guests: string | null;
  message: string | null;
  handled: boolean;
  createdAt: Date;
};

export function computeStrength(page: {
  bodyContent: string | null;
  subtitle: string | null;
  tagline: string | null;
  heroImageUrl: string | null;
  galleryUrls: string | null;
  customFields: string | null;
}): { score: number; items: StrengthItem[] } {
  const fields = parseCustomFields(page.customFields);
  const info = getBusinessInfo(fields);
  let gallery: string[] = [];
  try {
    const g = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
    gallery = Array.isArray(g) ? g : [];
  } catch {
    gallery = [];
  }
  const body = decodeKenticoText(page.bodyContent) ?? "";

  const items: StrengthItem[] = [
    { label: "A description of at least a couple of sentences", done: body.length >= 120, hint: "Add or expand the description." },
    { label: "A headline summary", done: !!(page.subtitle || page.tagline), hint: "Add a one-line summary." },
    { label: "A main photo", done: !!page.heroImageUrl, hint: "Choose a main photo." },
    { label: "At least three more photos", done: gallery.length >= 3, hint: "Add photos to the gallery." },
    { label: "A phone number", done: !!info?.phone, hint: "Add a contact phone number." },
    { label: "An email address", done: !!info?.email, hint: "Add a contact email." },
    { label: "A full address and postcode", done: !!(info?.address && info?.postcode), hint: "Complete the address fields." },
    { label: "A website or booking link", done: !!(info?.website || info?.bookingUrl), hint: "Add your website or booking link." },
    { label: "Opening times or prices", done: !!(info?.openingTimes || info?.admission), hint: "Add opening times or prices." },
    { label: "A map location", done: info?.mapLat != null && info?.mapLng != null, hint: "Ask the team to add your map location." },
  ];
  return { score: Math.round((items.filter((i) => i.done).length / items.length) * 100), items };
}

export async function getMemberListings(userId: string): Promise<MemberListing[]> {
  const pages = await prisma.page.findMany({
    where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
    orderBy: { title: "asc" },
  });
  if (pages.length === 0) return [];
  const ids = pages.map((p) => p.id);

  const [grouped, requests] = await Promise.all([
    prisma.bookingRequest.groupBy({ by: ["pageId", "status"], where: { pageId: { in: ids } }, _count: { _all: true } }),
    prisma.changeRequest.findMany({
      where: { pageId: { in: ids }, authorId: userId, status: { in: ["DRAFT", "SUBMITTED", "REJECTED"] } },
      select: { pageId: true, status: true },
    }),
  ]);
  const counts = new Map<string, { total: number; fresh: number }>();
  for (const g of grouped) {
    const c = counts.get(g.pageId) ?? { total: 0, fresh: 0 };
    c.total += g._count._all;
    if (g.status === "NEW") c.fresh += g._count._all;
    counts.set(g.pageId, c);
  }
  const change = new Map(requests.map((r) => [r.pageId, r.status as "DRAFT" | "SUBMITTED" | "REJECTED"]));

  return pages.map((p) => {
    const info = getBusinessInfo(parseCustomFields(p.customFields));
    const c = counts.get(p.id) ?? { total: 0, fresh: 0 };
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      status: p.status,
      statusLabel: STATUS_LABEL[p.status] ?? p.status,
      tierLabel: p.membershipTier ? (TIER_LABEL[p.membershipTier] ?? p.membershipTier) : null,
      heroImageUrl: p.heroImageUrl,
      town: info?.town ?? null,
      summary: decodeKenticoText(p.subtitle) ?? p.tagline,
      strength: computeStrength(p),
      enquiryCount: c.total,
      newEnquiryCount: c.fresh,
      change: change.get(p.id) ?? null,
    };
  });
}

export async function getMemberEnquiries(userId: string, limit = 100): Promise<MemberEnquiry[]> {
  const pages = await prisma.page.findMany({ where: { assignedMemberId: userId }, select: { id: true } });
  if (pages.length === 0) return [];
  const rows = await prisma.bookingRequest.findMany({
    where: { pageId: { in: pages.map((p) => p.id) } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    listingId: r.pageId,
    listingTitle: r.pageTitle,
    listingSlug: r.pageSlug,
    name: r.name,
    email: r.email,
    phone: r.phone,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    guests: r.guests,
    message: r.message,
    handled: r.status === "HANDLED",
    createdAt: r.createdAt,
  }));
}
