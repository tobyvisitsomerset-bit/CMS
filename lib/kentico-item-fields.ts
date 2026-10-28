// Real Kentico content (sz.touristitem / sz.business / etc.) carries rich
// business data — phone, email, address, opening times, booking link — but
// the import only mapped title/subtitle/body/hero to real Page columns;
// everything else landed in the generic customFields key/value list. This
// pulls the recognized fields back out so the editor can render them as
// proper widgets instead of a raw key/value dump.

export type ItemFields = Record<string, string>;

export function parseCustomFields(customFields: string | null): ItemFields {
  if (!customFields) return {};
  try {
    const entries = JSON.parse(customFields) as { key: string; value: string }[];
    return Object.fromEntries(entries.map((e) => [e.key, e.value]));
  } catch {
    return {};
  }
}

// parseCustomFields()/Object.fromEntries collapses repeated keys to the last
// value — some real Kentico fields (e.g. ItemGradingName) legitimately repeat
// per page (a business can hold several awards). This reads the raw array
// directly so no earlier values are silently dropped.
export function getAllFieldValues(customFields: string | null, key: string): string[] {
  if (!customFields) return [];
  try {
    const entries = JSON.parse(customFields) as { key: string; value: string }[];
    return entries.filter((e) => e.key === key).map((e) => e.value);
  } catch {
    return [];
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  pound: "£",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  rsquo: "'",
  lsquo: "'",
  rdquo: '"',
  ldquo: '"',
  ndash: "–",
  mdash: "—",
  hellip: "…",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  acirc: "â",
  ccedil: "ç",
  ocirc: "ô",
  uuml: "ü",
  ouml: "ö",
  euro: "€",
  deg: "°",
  times: "×",
  copy: "©",
  reg: "®",
};

export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z0-9]+);/gi, (m, name) => NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

// Kentico stores rich-text fields (opening times, admission) as HTML and
// plain fields with HTML entities escaped — decode both for display without
// resorting to dangerouslySetInnerHTML anywhere in the editor UI.
export function decodeKenticoText(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = decodeEntities(value.replace(/<br\s*\/?>/gi, " · ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .replace(/\s·\s·\s/g, " · ")
    .trim();
  return decoded || null;
}

/**
 * Page body text for display: like decodeKenticoText but keeps paragraph
 * breaks (a blank line between blocks), so long pages such as the terms and
 * the itineraries read as paragraphs rather than one block.
 */
export function decodeKenticoBody(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeEntities(
    value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|h[1-6]|li)>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || null;
}

export type BusinessInfo = {
  address: string | null;
  town: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bookingUrl: string | null;
  bookingLabel: string;
  openingTimes: string | null;
  admission: string | null;
  mapLat: number | null;
  mapLng: number | null;
  memberName: string | null;
  facebook: string | null;
  twitter: string | null;
  instagram: string | null;
  videoLink: string | null;
  starRating: number | null;
  startDate: string | null;
  endDate: string | null;
};

// A member page is always rendered with the listing template, even before any
// of its form boxes have been filled in, so that the template (and not a
// separately rebuilt page) shows each field as soon as it is entered.
export function emptyBusinessInfo(): BusinessInfo {
  return {
    address: null,
    town: null,
    postcode: null,
    phone: null,
    email: null,
    website: null,
    bookingUrl: null,
    bookingLabel: "Book Now",
    openingTimes: null,
    admission: null,
    mapLat: null,
    mapLng: null,
    memberName: null,
    facebook: null,
    twitter: null,
    instagram: null,
    videoLink: null,
    starRating: null,
    startDate: null,
    endDate: null,
  };
}

/**
 * Turns what was typed into a Website box into a link that works. Kentico
 * stored whatever people typed, so "www.example.co.uk" and "example.co.uk"
 * are common; without a scheme the browser treats them as paths on this site.
 * Anything that is clearly not a web address ("Book Now", an email address,
 * text with spaces) returns null so no broken link is shown.
 */
export function webUrl(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return /\s/.test(v) ? null : v;
  if (v.startsWith("//")) return /\s/.test(v) ? null : `https:${v}`;
  if (/\s/.test(v) || v.includes("@") || !/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?(\?\S*)?$/i.test(v)) return null;
  return `https://${v}`;
}

export function getBusinessInfo(fields: ItemFields): BusinessInfo | null {
  const address = [fields.ItemAddress1, fields.ItemAddress2].filter(Boolean).join(", ") || null;
  const town = fields.ItemTown || null;
  const postcode = fields.ItemPostcode || null;
  const phone = fields.ItemPhone || null;
  const email = fields.ItemEmail || null;
  const website = webUrl(fields.ItemWeb);
  const bookingUrl = webUrl(fields.ItemBookingWeb);
  const bookingLabel = fields.ItemBookingWebButtonText || "Book Now";
  const openingTimes = decodeKenticoText(fields.ItemOpeningTimes);
  const admission = decodeKenticoText(fields.ItemAdmission);
  const mapLat = fields.ItemMapLatitude ? Number(fields.ItemMapLatitude) : null;
  const mapLng = fields.ItemMapLongitude ? Number(fields.ItemMapLongitude) : null;
  const memberName = fields.ItemMemberName || null;
  const facebook = webUrl(fields.ItemFacebook);
  const twitter = webUrl(fields.ItemTwitter);
  const instagram = webUrl(fields.ItemInstagram);
  const videoLink = webUrl(fields.ItemVideoLink);
  const stars = Number(fields.ItemStarRating);
  const starRating = Number.isInteger(stars) && stars >= 1 && stars <= 5 ? stars : null;
  const startDate = fields.ItemStartDate || null;
  const endDate = fields.ItemEndDate || null;

  const hasAnything =
    address ||
    phone ||
    email ||
    website ||
    bookingUrl ||
    openingTimes ||
    admission ||
    (mapLat && mapLng) ||
    startDate ||
    facebook ||
    twitter ||
    instagram ||
    videoLink ||
    starRating ||
    town ||
    postcode;
  if (!hasAnything) return null;

  return {
    address,
    town,
    postcode,
    phone,
    email,
    website,
    bookingUrl,
    bookingLabel,
    openingTimes,
    admission,
    mapLat: Number.isFinite(mapLat) ? mapLat : null,
    mapLng: Number.isFinite(mapLng) ? mapLng : null,
    memberName,
    facebook,
    twitter,
    instagram,
    videoLink,
    starRating,
    startDate,
    endDate,
  };
}
