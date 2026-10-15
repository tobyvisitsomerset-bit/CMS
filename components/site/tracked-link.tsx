"use client";

// A normal link that also counts the click against the listing, so members
// can see how many people went on to their website, booking page, phone,
// email or directions. Uses a beacon so it never slows or blocks the click.
// With no pageId (the Content Hub preview) it is just a link.

export type ClickKind = "web" | "booking" | "phone" | "email" | "directions";

export function TrackedLink({
  pageId,
  kind,
  href,
  children,
  ...rest
}: {
  pageId: string | null;
  kind: ClickKind;
  href: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  function track() {
    if (!pageId) return;
    try {
      const body = JSON.stringify({ pageId, kind });
      if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
      else void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
    } catch {
      /* counting must never get in the way of the click */
    }
  }
  return (
    <a href={href} onClick={track} {...rest}>
      {children}
    </a>
  );
}
