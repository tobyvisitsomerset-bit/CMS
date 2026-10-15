import { prisma } from "@/lib/prisma";
import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { levelLabel } from "@/lib/membership";
import { computeHealthScore, type HealthItem, type HealthScore } from "@/lib/health-score";
import { labelForSlugSegment } from "@/lib/site-nav";

// Everything the Member Portal shows is read from the same database as the
// Content Hub and public site. Nothing here is estimated or invented: counts
// are real rows, and "listing strength" is a transparent checklist over real
// fields.


const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Awaiting approval",
  PUBLISHED: "Live",
  ARCHIVED: "Archived",
};

export type StrengthItem = { label: string; done: boolean; hint: string; earned?: number; max?: number };

export type MemberListing = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PENDING_APPROVAL" | "PUBLISHED" | "ARCHIVED";
  statusLabel: string;
  tierLabel: string | null;
  heroImageUrl: string | null;
  town: string | null;
  section: string;
  updatedAt: Date;
  photoCount: number;
  summary: string | null;
  strength: { score: number; items: StrengthItem[]; recommendations: HealthItem[]; band: HealthScore["band"] };
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
  updatedAt?: Date | null;
  tagCount?: number;
}): { score: number; items: StrengthItem[]; recommendations: HealthItem[]; band: HealthScore["band"] } {
  const h = computeHealthScore(page);
  return {
    score: h.score,
    items: h.items.map((i) => ({ label: i.label, done: i.done, hint: i.hint, earned: i.earned, max: i.max })),
    recommendations: h.recommendations,
    band: h.band,
  };
}

export async function getMemberListings(userId: string): Promise<MemberListing[]> {
  const pages = await prisma.page.findMany({
    where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
    include: { tags: { select: { id: true } } },
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
      tierLabel: levelLabel(p.membershipTier),
      heroImageUrl: p.heroImageUrl,
      town: info?.town ?? null,
      section: labelForSlugSegment(p.slug.split("/")[0]),
      updatedAt: p.updatedAt,
      photoCount: (() => {
        try {
          const g = p.galleryUrls ? JSON.parse(p.galleryUrls) : [];
          return (Array.isArray(g) ? g.length : 0) + (p.heroImageUrl ? 1 : 0);
        } catch {
          return p.heroImageUrl ? 1 : 0;
        }
      })(),
      summary: decodeKenticoText(p.subtitle) ?? p.tagline,
      strength: computeStrength({ ...p, tagCount: p.tags.length }),
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
