import { parseCustomFieldsArray, serializeCustomFields, setCF } from "@/lib/custom-fields";

// The site's listing explorers, map, search and homepage teasers recognise a
// real listing by the Kentico class marker stored in its custom fields. Pages
// created in this CMS (by staff or approved from a member) never had one, so
// they were saved but never listed. This adds the same marker, additively.

export const LISTING_CLASS = "sz.touristitem";

const BUSINESS_KEYS = [
  "ItemPhone",
  "ItemEmail",
  "ItemWeb",
  "ItemAddress1",
  "ItemTown",
  "ItemPostcode",
  "ItemOpeningTimes",
  "ItemAdmission",
  "ItemBookingWeb",
  "ItemStartDate",
  "ItemMapLatitude",
];

export const LISTING_ROOTS = ["places-to-stay/", "things-to-do/", "festivals-events/"];

export function hasBusinessFields(customFields: string | null): boolean {
  if (!customFields) return false;
  return parseCustomFieldsArray(customFields).some((f) => BUSINESS_KEYS.includes(f.key) && f.value);
}

/** True if the page already carries a Kentico class (real import or marked). */
export function hasClassMarker(customFields: string | null): boolean {
  return parseCustomFieldsArray(customFields).some((f) => f.key === "_kenticoClassName" && f.value);
}

/**
 * Adds the listing marker when the page is a listing: it has business fields,
 * or sits under a listing section and is not a folder. Never overwrites an
 * existing class.
 */
export function withListingMarker(
  customFields: string | null,
  opts: { slug: string; isSection?: boolean; force?: boolean },
): string | null {
  if (hasClassMarker(customFields)) return customFields;
  const underRoot = LISTING_ROOTS.some((r) => opts.slug.startsWith(r));
  const isListing = opts.force || hasBusinessFields(customFields) || (underRoot && !opts.isSection);
  if (!isListing) return customFields;
  return serializeCustomFields(setCF(parseCustomFieldsArray(customFields), "_kenticoClassName", LISTING_CLASS));
}
