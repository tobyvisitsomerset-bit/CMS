// The Somerset Club mailing list lives in MailerLite. This keeps the site's
// side small and safe: it only ever adds or removes one email from one group,
// never throws into the page that called it, and does nothing at all until
// the key is set.
//
//   MAILERLITE_API_KEY        the API token from MailerLite (Integrations > API)
//   MAILERLITE_CLUB_GROUP_ID  optional; the group people join (defaults to Visit Somerset Consumers)
//
// MailerLite is a marketing tool, not a transactional one, so it is used for
// the club only (not for password resets or receipts).

const API = "https://connect.mailerlite.com/api";

// The club list is the existing "Visit Somerset Consumers" group.
const CLUB_GROUP = () => process.env.MAILERLITE_CLUB_GROUP_ID || "81990228004308782";

export function mailerliteConfigured(): boolean {
  return !!process.env.MAILERLITE_API_KEY;
}

async function call(path: string, init: RequestInit): Promise<Response | null> {
  const key = process.env.MAILERLITE_API_KEY;
  if (!key) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${API}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
    clearTimeout(t);
    return res;
  } catch {
    return null;
  }
}

/** Adds (or updates) a subscriber in the Somerset Club group. True when MailerLite accepted it. */
export async function addToClub(input: { email: string; name?: string | null }): Promise<boolean> {
  const group = CLUB_GROUP();
  if (!mailerliteConfigured()) return false;
  const res = await call("/subscribers", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      fields: input.name ? { name: input.name.split(" ")[0], last_name: input.name.split(" ").slice(1).join(" ") || undefined } : undefined,
      groups: [group],
    }),
  });
  return !!res && (res.status === 200 || res.status === 201);
}

/** Takes a subscriber out of the Somerset Club group (they stay on any other lists). */
export async function removeFromClub(email: string): Promise<boolean> {
  const group = CLUB_GROUP();
  if (!mailerliteConfigured()) return false;
  const found = await call(`/subscribers/${encodeURIComponent(email)}`, { method: "GET" });
  if (!found || !found.ok) return false;
  const body = (await found.json().catch(() => null)) as { data?: { id?: string } } | null;
  const id = body?.data?.id;
  if (!id) return false;
  const res = await call(`/subscribers/${id}/groups/${group}`, { method: "DELETE" });
  return !!res && (res.status === 200 || res.status === 204);
}
