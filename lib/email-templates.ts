import type { Mail } from "@/lib/email";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function siteUrl(): string {
  return (process.env.NEXTAUTH_URL || "https://cms-production-e3da.up.railway.app").replace(/\/$/, "");
}

const WHAT_YOU_CAN_DO: Record<string, string> = {
  MEMBER: "You can update your listing, add events and offers, see enquiries and choose where you appear. Changes are checked by our team before they go live.",
  CONTENT_ADMIN: "You can manage pages, approve member changes and look after members in the Content Hub.",
  SUPER_ADMIN: "You have full access to the Content Hub, including users and settings.",
  READ_ONLY: "You can view the Content Hub.",
};

/** "Your Visit Somerset account has been created": sign-in link, email and a temporary password. */
export function welcomeEmail(input: {
  name: string;
  email: string;
  password: string;
  roleKey: string;
  pageTitles: string[];
}): Mail {
  const url = `${siteUrl()}/login`;
  const first = input.name.split(" ")[0];
  const what = WHAT_YOU_CAN_DO[input.roleKey] ?? "";
  const pages = input.pageTitles.length > 0 ? `Your listing${input.pageTitles.length > 1 ? "s" : ""}: ${input.pageTitles.join(", ")}.` : "";

  const text = [
    `Hello ${first},`,
    "",
    "Your Visit Somerset account has been created.",
    pages,
    what,
    "",
    `Sign in here: ${url}`,
    `Email: ${input.email}`,
    `Temporary password: ${input.password}`,
    "",
    "Please change your password after you first sign in (Account page).",
    "",
    "If you were not expecting this email, you can ignore it.",
    "Visit Somerset",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f3;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#3d685b;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:bold">Visit Somerset</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">Your Visit Somerset account has been created</h1>
<p style="margin:0 0 12px;line-height:1.5">Hello ${esc(first)},</p>
${pages ? `<p style="margin:0 0 12px;line-height:1.5">${esc(pages)}</p>` : ""}
<p style="margin:0 0 20px;line-height:1.5">${esc(what)}</p>
<p style="margin:0 0 20px"><a href="${url}" style="background:#6f266f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;display:inline-block">Sign in</a></p>
<table role="presentation" cellpadding="0" cellspacing="0" style="background:#f1f2f0;border-radius:12px;width:100%"><tr><td style="padding:16px;font-size:14px;line-height:1.7">
<strong>Email:</strong> ${esc(input.email)}<br>
<strong>Temporary password:</strong> <span style="font-family:monospace;font-size:15px">${esc(input.password)}</span>
</td></tr></table>
<p style="margin:20px 0 0;font-size:13px;color:#57534e;line-height:1.5">Please change your password after you first sign in. If you were not expecting this email you can ignore it.</p>
</td></tr></table>
</td></tr></table></body></html>`;

  return { to: input.email, toName: input.name, subject: "Your Visit Somerset account has been created", html, text };
}
