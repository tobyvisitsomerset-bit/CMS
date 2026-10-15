import FACILITY_IDS from "@/lib/data/facility-ids.json";
import { parseCustomFields } from "@/lib/kentico-item-fields";

// Accessible Somerset. Real listings carry Kentico facility ids in
// ItemFacilities ("1526|1797|..."). Those are turned into the handful of
// access features visitors care about, and members can add or correct them
// themselves (ItemAccessibility, a comma list of the keys below). Nothing is
// guessed: a feature is shown only when the data says so.

export type AccessKey =
  | "wheelchair"
  | "stepFree"
  | "hearingLoop"
  | "accessibleToilet"
  | "blueBadge"
  | "accessibleStay"
  | "changingPlaces"
  | "dogFriendly";

export const ACCESS_FEATURES: { key: AccessKey; label: string; short: string; help: string }[] = [
  { key: "wheelchair", label: "Wheelchair access", short: "Wheelchair", help: "A wheelchair user can get in and around." },
  { key: "stepFree", label: "Step-free access", short: "Step-free", help: "Level entrance, ramp or lift, no steps to the main areas." },
  { key: "hearingLoop", label: "Hearing loop", short: "Hearing loop", help: "A hearing loop or facilities for hearing-impaired visitors." },
  { key: "accessibleToilet", label: "Accessible toilet", short: "Accessible toilet", help: "An accessible or disabled toilet on site." },
  { key: "blueBadge", label: "Blue Badge parking", short: "Blue Badge", help: "Designated parking for disabled visitors." },
  { key: "accessibleStay", label: "Accessible accommodation", short: "Accessible rooms", help: "Accessible rooms, ground floor rooms or a wet room." },
  { key: "changingPlaces", label: "Changing Places", short: "Changing Places", help: "A Changing Places facility." },
  { key: "dogFriendly", label: "Dog friendly", short: "Dog friendly", help: "Dogs are welcome." },
];

const ACCESS_KEYS = new Set<string>(ACCESS_FEATURES.map((f) => f.key));

export function accessLabel(key: string): string {
  return ACCESS_FEATURES.find((f) => f.key === key)?.label ?? key;
}

const PATTERNS: Record<Exclude<AccessKey, "dogFriendly">, RegExp> = {
  wheelchair:
    /wheelchair|level 3|all areas accessible|accessible to disabled|facilities for the disabled|facilit(?:ies|es) for disabled|disabled access|suitable for people with limited mobility|compliant with dda|^accessible$/i,
  stepFree: /step-?\s?free|level access|ramp|\blift\b|ground floor|level 1|level 2|handrail by steps/i,
  hearingLoop: /hearing|\bloop\b|sign language/i,
  accessibleToilet: /accessible toilet|disabled toilet|toilets? for disabled|wheelchair access and toilet|accessible to.*toilet|level access.*toilet/i,
  blueBadge: /parking.*(?:disab|wheelchair)|(?:disab|wheelchair).*parking|designated parking|blue badge parking/i,
  accessibleStay: /accessible rooms?|accommodation available for visitors with disabilities|ground floor bed|wet room/i,
  changingPlaces: /changing places/i,
};

const NOT_FEATURE = /^(?:blue badge guide|blue badge guides admitted free|shopmobility|wheelchair hire)$/i;

type FacilityRow = [string, string];
const TABLE = FACILITY_IDS as unknown as Record<string, FacilityRow>;

export type ListingAccess = {
  /** Feature keys that apply, in display order. */
  features: AccessKey[];
  /** The listing's own accessibility facilities, as the business described them. */
  facilities: string[];
  /** Pet facilities, as described. */
  pets: string[];
};

const EMPTY: ListingAccess = { features: [], facilities: [], pets: [] };

export function getListingAccess(customFields: string | null): ListingAccess {
  if (!customFields) return EMPTY;
  const f = parseCustomFields(customFields);
  const found = new Set<AccessKey>();
  const facilities: string[] = [];
  const pets: string[] = [];

  for (const id of (f.ItemFacilities ?? "").split("|")) {
    const row = TABLE[id.trim()];
    if (!row) continue;
    const [name, group] = row;
    if (group === "PET INFORMATION") {
      pets.push(name);
      if (/dog friendly|dogs accepted|dogs allowed|pets accepted|dogs on lead/i.test(name) && !/^no dogs/i.test(name)) found.add("dogFriendly");
    }
    if (group === "ACCESSIBILITY" || group === "PARKING & TRANSPORT" || group === "ROOM & UNIT FEATURES") {
      if (NOT_FEATURE.test(name.trim())) {
        if (group === "ACCESSIBILITY") facilities.push(name);
        continue;
      }
      for (const [key, re] of Object.entries(PATTERNS) as [Exclude<AccessKey, "dogFriendly">, RegExp][]) {
        if (re.test(name)) {
          found.add(key);
        }
      }
      if (group === "ACCESSIBILITY") facilities.push(name);
    }
  }

  // What the business has told us themselves.
  for (const k of (f.ItemAccessibility ?? "").split(",")) {
    const key = k.trim();
    if (ACCESS_KEYS.has(key)) found.add(key as AccessKey);
  }

  const features = ACCESS_FEATURES.map((x) => x.key).filter((k) => found.has(k));
  return { features, facilities: Array.from(new Set(facilities)), pets: Array.from(new Set(pets)) };
}

/** Just the keys, for lists and filters. */
export function accessKeys(customFields: string | null): AccessKey[] {
  return getListingAccess(customFields).features;
}

/** What members have entered themselves (the editable part). */
export function ownAccessKeys(customFields: string | null): AccessKey[] {
  const raw = parseCustomFields(customFields).ItemAccessibility ?? "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k): k is AccessKey => ACCESS_KEYS.has(k));
}
