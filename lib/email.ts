// Transactional email (account created, password reset). Marketing email goes
// through MailerLite (lib/mailerlite.ts); this is for one-to-one messages.
//
// Pick one provider by setting its key in the environment:
//   MAILERSEND_API_KEY   MailerSend (MailerLite's sister product, same company)
//   RESEND_API_KEY       Resend
// and always set the sender, which must be on a domain verified with the
// provider:
//   MAIL_FROM_EMAIL      e.g. accounts@visitsomerset.co.uk
//   MAIL_FROM_NAME       optional, defaults to "Visit Somerset"
//
// Until then sending is skipped and the caller is told so, so nothing breaks.

export type Mail = { to: string; toName?: string; subject: string; html: string; text: string };

export type MailResult = { ok: true; provider: string } | { ok: false; reason: "not-configured" | "failed" };

export function emailConfigured(): boolean {
  return !!(process.env.MAIL_FROM_EMAIL && (process.env.MAILERSEND_API_KEY || process.env.RESEND_API_KEY));
}

async function post(url: string, key: string, body: unknown): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendEmail(mail: Mail): Promise<MailResult> {
  const from = process.env.MAIL_FROM_EMAIL;
  const fromName = process.env.MAIL_FROM_NAME || "Visit Somerset";
  if (!from) return { ok: false, reason: "not-configured" };

  if (process.env.MAILERSEND_API_KEY) {
    const ok = await post("https://api.mailersend.com/v1/email", process.env.MAILERSEND_API_KEY, {
      from: { email: from, name: fromName },
      to: [{ email: mail.to, name: mail.toName }],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return ok ? { ok: true, provider: "mailersend" } : { ok: false, reason: "failed" };
  }

  if (process.env.RESEND_API_KEY) {
    const ok = await post("https://api.resend.com/emails", process.env.RESEND_API_KEY, {
      from: `${fromName} <${from}>`,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    return ok ? { ok: true, provider: "resend" } : { ok: false, reason: "failed" };
  }

  return { ok: false, reason: "not-configured" };
}
