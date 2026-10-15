import { decodeKenticoText, getBusinessInfo, parseCustomFields } from "@/lib/kentico-item-fields";
import { getListingAccess } from "@/lib/accessibility";

// Member Health Score: a transparent 0 to 100 for how complete and useful a
// listing is. Every point is explained and comes from a real field, and each
// missing item says what to do. "Image quality" is not scored yet because the
// site does not measure image dimensions; photo count is.

export type HealthItem = {
  key: string;
  label: string;
  max: number;
  earned: number;
  hint: string;
  /** Kept for the older checklist views. */
  done: boolean;
};

export type HealthScore = {
  score: number;
  items: HealthItem[];
  /** Biggest gains first, for "how to improve". */
  recommendations: HealthItem[];
  band: "Needs attention" | "Getting there" | "Strong" | "Excellent";
};

type Input = {
  bodyContent: string | null;
  subtitle: string | null;
  tagline: string | null;
  heroImageUrl: string | null;
  galleryUrls: string | null;
  customFields: string | null;
  updatedAt?: Date | null;
  tagCount?: number;
  roomCount?: number;
};

function tier(value: number, steps: [number, number][]): number {
  let earned = 0;
  for (const [threshold, points] of steps) if (value >= threshold) earned = Math.max(earned, points);
  return earned;
}

export function computeHealthScore(page: Input): HealthScore {
  const fields = parseCustomFields(page.customFields);
  const info = getBusinessInfo(fields);
  const access = getListingAccess(page.customFields);
  let gallery: string[] = [];
  try {
    const g = page.galleryUrls ? JSON.parse(page.galleryUrls) : [];
    gallery = Array.isArray(g) ? g : [];
  } catch {
    gallery = [];
  }
  const body = (decodeKenticoText(page.bodyContent) ?? "").length;
  const facilityCount = (fields.ItemFacilities ?? "").split("|").filter(Boolean).length;
  const isEvent = !!info?.startDate;

  const stale = page.updatedAt ? Date.now() - page.updatedAt.getTime() > 365 * 86400000 : false;
  const eventUpcoming = isEvent && info?.startDate ? new Date(info.endDate ?? info.startDate).getTime() >= Date.now() - 86400000 : false;

  const items: HealthItem[] = [
    {
      key: "description",
      label: "A full description",
      max: 10,
      earned: tier(body, [[80, 3], [200, 6], [400, 10]]),
      hint: "Write at least 400 characters: what makes you special, who it suits, what to expect.",
      done: false,
    },
    {
      key: "summary",
      label: "A headline summary",
      max: 5,
      earned: page.subtitle || page.tagline ? 5 : 0,
      hint: "Add a one or two sentence summary for search results and cards.",
      done: false,
    },
    {
      key: "photo",
      label: "A main photo",
      max: 10,
      earned: page.heroImageUrl ? 10 : 0,
      hint: "Upload a bright, wide main photo.",
      done: false,
    },
    {
      key: "gallery",
      label: "More photos",
      max: 10,
      earned: tier(gallery.length, [[1, 3], [3, 6], [5, 10]]),
      hint: "Add at least five photos to the gallery.",
      done: false,
    },
    {
      key: "contact",
      label: "Phone and email",
      max: 10,
      earned: (info?.phone ? 5 : 0) + (info?.email ? 5 : 0),
      hint: "Add a contact phone number and email address.",
      done: false,
    },
    {
      key: "address",
      label: "Full address and postcode",
      max: 5,
      earned: info?.address && info?.postcode ? 5 : 0,
      hint: "Complete the address and postcode so people can find you.",
      done: false,
    },
    {
      key: "website",
      label: "Website",
      max: 5,
      earned: info?.website ? 5 : 0,
      hint: "Add your website address.",
      done: false,
    },
    {
      key: "booking",
      label: "Online booking link",
      max: 5,
      earned: info?.bookingUrl ? 5 : 0,
      hint: "Add a booking link so visitors can book straight from your page.",
      done: false,
    },
    {
      key: "hours",
      label: "Opening times",
      max: 10,
      earned: info?.openingTimes || fields.ItemGeneralOpeningInformation ? 10 : 0,
      hint: "Add your opening times, including any seasonal changes.",
      done: false,
    },
    {
      key: "prices",
      label: "Prices",
      max: 5,
      earned: info?.admission ? 5 : 0,
      hint: "Add prices or admission so visitors can plan a budget.",
      done: false,
    },
    {
      key: "access",
      label: "Accessibility information",
      max: 10,
      earned: access.features.filter((k) => k !== "dogFriendly").length > 0 || access.facilities.length > 0 ? 10 : 0,
      hint: "Tick the access features you offer (step-free, wheelchair, hearing loop, accessible toilet, Blue Badge parking).",
      done: false,
    },
    {
      key: "facilities",
      label: "Facilities and tags",
      max: 5,
      earned: (page.tagCount ?? 0) >= 3 || facilityCount >= 3 ? 5 : 0,
      hint: "Add at least three tags describing what you offer.",
      done: false,
    },
    {
      key: "map",
      label: "Map location",
      max: 5,
      earned: info?.mapLat != null && info?.mapLng != null ? 5 : 0,
      hint: "Ask the team to add your map pin.",
      done: false,
    },
    {
      key: "fresh",
      label: isEvent ? "Event is still to come" : "Updated in the last 12 months",
      max: 5,
      earned: isEvent ? (eventUpcoming ? 5 : 0) : stale ? 0 : 5,
      hint: isEvent ? "This event has passed. Add the new dates or remove it." : "Review your page and save any updates so visitors can trust it.",
      done: false,
    },
  ];

  for (const i of items) i.done = i.earned >= i.max;
  const score = Math.min(100, items.reduce((s, i) => s + i.earned, 0));
  const recommendations = items
    .filter((i) => i.earned < i.max)
    .sort((a, b) => b.max - b.earned - (a.max - a.earned))
    .slice(0, 4);
  const band: HealthScore["band"] = score >= 90 ? "Excellent" : score >= 70 ? "Strong" : score >= 45 ? "Getting there" : "Needs attention";
  return { score, items, recommendations, band };
}
