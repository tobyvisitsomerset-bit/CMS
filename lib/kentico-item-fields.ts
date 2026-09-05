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

// Kentico stores rich-text fields (opening times, admission) as HTML and
// plain fields with HTML entities escaped — decode both for display without
// resorting to dangerouslySetInnerHTML anywhere in the editor UI.
export function decodeKenticoText(value: string | null | undefined): string | null {
  if (!value) return null;
  const decoded = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&pound;/g, "£")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&#8217;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return decoded || null;
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
  startDate: string | null;
  endDate: string | null;
};

export function getBusinessInfo(fields: ItemFields): BusinessInfo | null {
  const address = [fields.ItemAddress1, fields.ItemAddress2].filter(Boolean).join(", ") || null;
  const town = fields.ItemTown || null;
  const postcode = fields.ItemPostcode || null;
  const phone = fields.ItemPhone || null;
  const email = fields.ItemEmail || null;
  const website = fields.ItemWeb || null;
  const bookingUrl = fields.ItemBookingWeb || null;
  const bookingLabel = fields.ItemBookingWebButtonText || "Book Now";
  const openingTimes = decodeKenticoText(fields.ItemOpeningTimes);
  const admission = decodeKenticoText(fields.ItemAdmission);
  const mapLat = fields.ItemMapLatitude ? Number(fields.ItemMapLatitude) : null;
  const mapLng = fields.ItemMapLongitude ? Number(fields.ItemMapLongitude) : null;
  const memberName = fields.ItemMemberName || null;
  const startDate = fields.ItemStartDate || null;
  const endDate = fields.ItemEndDate || null;

  const hasAnything =
    address || phone || email || website || bookingUrl || openingTimes || admission || (mapLat && mapLng) || startDate;
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
    startDate,
    endDate,
  };
}
