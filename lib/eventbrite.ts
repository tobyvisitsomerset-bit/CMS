import { prisma } from "@/lib/prisma";

// Visit Somerset's own member events can be fed from Eventbrite. Set:
//   EVENTBRITE_TOKEN    a private token from Eventbrite (Account settings > Developer links > API keys)
//   EVENTBRITE_ORG_ID   the organisation id whose live events should appear
// Nothing runs until both are set. Events are matched on their Eventbrite id,
// so syncing again updates them instead of duplicating.

export function eventbriteConfigured(): boolean {
  return !!(process.env.EVENTBRITE_TOKEN && process.env.EVENTBRITE_ORG_ID);
}

type EbEvent = {
  id: string;
  name?: { text?: string };
  summary?: string;
  description?: { text?: string };
  url?: string;
  capacity?: number | null;
  start?: { utc?: string };
  end?: { utc?: string };
  venue?: { name?: string; address?: { localized_address_display?: string } } | null;
  online_event?: boolean;
  status?: string;
};

type EbPage = { events?: EbEvent[]; pagination?: { has_more_items?: boolean; continuation?: string } };

export async function syncEventbrite(): Promise<{ ok: boolean; created: number; updated: number; error?: string }> {
  if (!eventbriteConfigured()) return { ok: false, created: 0, updated: 0, error: "Eventbrite is not set up yet." };
  const token = process.env.EVENTBRITE_TOKEN as string;
  const org = process.env.EVENTBRITE_ORG_ID as string;

  let continuation: string | undefined;
  let created = 0;
  let updated = 0;
  try {
    for (let page = 0; page < 10; page++) {
      const url = new URL(`https://www.eventbriteapi.com/v3/organizations/${encodeURIComponent(org)}/events/`);
      url.searchParams.set("status", "live");
      url.searchParams.set("order_by", "start_asc");
      url.searchParams.set("expand", "venue");
      if (continuation) url.searchParams.set("continuation", continuation);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      if (!res.ok) return { ok: false, created, updated, error: `Eventbrite replied ${res.status}.` };
      const body = (await res.json()) as EbPage;

      for (const e of body.events ?? []) {
        if (!e.id || !e.start?.utc) continue;
        const data = {
          title: (e.name?.text ?? "Untitled event").slice(0, 200),
          description: (e.summary || e.description?.text || "").slice(0, 4000) || null,
          startsAt: new Date(e.start.utc),
          endsAt: e.end?.utc ? new Date(e.end.utc) : null,
          location: e.online_event ? "Online" : (e.venue?.name ?? e.venue?.address?.localized_address_display ?? null),
          url: e.url ?? null,
          capacity: typeof e.capacity === "number" ? e.capacity : null,
          source: "eventbrite",
          externalId: e.id,
        };
        const existing = await prisma.vsEvent.findUnique({ where: { externalId: e.id }, select: { id: true } });
        if (existing) {
          await prisma.vsEvent.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.vsEvent.create({ data: { ...data, published: true } });
          created++;
        }
      }
      if (body.pagination?.has_more_items && body.pagination.continuation) continuation = body.pagination.continuation;
      else break;
    }
    return { ok: true, created, updated };
  } catch (e) {
    return { ok: false, created, updated, error: e instanceof Error ? e.message : "Could not reach Eventbrite." };
  }
}
