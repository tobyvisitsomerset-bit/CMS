import { prisma } from "@/lib/prisma";
import { decodeKenticoText, parseCustomFields } from "@/lib/kentico-item-fields";

// Buy Somerset (Phase 12): the real producers imported from Kentico's
// "Virtual Highstreet" section. Each producer record carries its shop
// platform (Shopify / WooCommerce); we read that shop's own PUBLIC product
// feed server-side (cached an hour) to show real products with real prices.
// A producer whose feed can't be read simply shows its description and a
// "Shop full range" link — never fabricated products. The stored integration
// credentials in the import (access tokens, API keys) are deliberately never
// read or sent anywhere.

export type ShopProduct = { title: string; price: string; imageUrl: string | null; url: string };

export type ShopProducer = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  town: string | null;
  heroImageUrl: string | null;
  website: string | null;
  buyLabel: string;
  products: ShopProduct[];
};

const FETCH_TIMEOUT_MS = 6000;

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function money(value: number | string, prefix = "£"): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "";
  return `${prefix}${n.toFixed(2)}`;
}

function httpsOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    // The server fetches this address, so never let a typo or a hostile value
    // point it at the machine itself or the internal network.
    const h = u.hostname.toLowerCase();
    const internal =
      h === "localhost" ||
      h.endsWith(".internal") ||
      h.endsWith(".local") ||
      /^\d+\.\d+\.\d+\.\d+$/.test(h) ||
      h.includes(":") ||
      !h.includes(".");
    if (u.protocol !== "https:" || internal) return null;
    return u.origin;
  } catch {
    return null;
  }
}

async function loadShopify(shop: string): Promise<ShopProduct[]> {
  const origin = httpsOrigin(shop.includes(".") ? shop : `${shop}.myshopify.com`);
  if (!origin) return [];
  const data = (await fetchJson(`${origin}/products.json?limit=12`)) as {
    products?: { title: string; handle: string; images?: { src: string }[]; variants?: { price: string }[] }[];
  } | null;
  return (data?.products ?? [])
    .filter((p) => p.title && p.variants?.[0]?.price)
    .slice(0, 12)
    .map((p) => ({
      title: p.title,
      price: money(p.variants![0].price),
      imageUrl: p.images?.[0]?.src ?? null,
      url: `${origin}/products/${p.handle}`,
    }));
}

async function loadWoo(origin: string): Promise<ShopProduct[]> {
  const data = (await fetchJson(`${origin}/wp-json/wc/store/v1/products?per_page=12`)) as
    | {
        name: string;
        permalink: string;
        images?: { src: string }[];
        prices?: { price: string; currency_prefix?: string; currency_minor_unit?: number };
      }[]
    | null;
  if (!Array.isArray(data)) return [];
  return data
    .filter((p) => p.name && p.prices?.price)
    .slice(0, 12)
    .map((p) => {
      const minor = p.prices!.currency_minor_unit ?? 2;
      return {
        title: decodeKenticoText(p.name) ?? p.name,
        price: money(Number(p.prices!.price) / 10 ** minor, p.prices!.currency_prefix || "£"),
        imageUrl: p.images?.[0]?.src ?? null,
        url: p.permalink,
      };
    });
}

type ProducerRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  bodyContent: string | null;
  heroImageUrl: string | null;
  customFields: string | null;
};

async function toProducer(r: ProducerRow): Promise<ShopProducer> {
      const f = parseCustomFields(r.customFields);
      const platform = (f.Platform || "").toLowerCase();
      let products: ShopProduct[] = [];
      if (platform === "shopify" && f.ShopifyShopName) {
        products = await loadShopify(f.ShopifyShopName);
      } else if (platform === "woocommerce") {
        const origin = httpsOrigin(f.FeedURL) ?? httpsOrigin(f.WebsiteURL) ?? httpsOrigin(f.ItemWeb);
        if (origin) products = await loadWoo(origin);
      }
      return {
        id: r.id,
        slug: r.slug,
        title: r.title,
        description: decodeKenticoText(r.bodyContent) ?? decodeKenticoText(r.subtitle) ?? decodeKenticoText(f.ItemSubtitle),
        town: f.ItemTown || f.ItemAddress4 || null,
        heroImageUrl: r.heroImageUrl,
        website: f.ItemBookingWeb || f.ItemWeb || (f.WebsiteURL ? (f.WebsiteURL.startsWith("http") ? f.WebsiteURL : `https://${f.WebsiteURL}`) : null),
        buyLabel: f.ItemBookingWebButtonText || "Shop",
        products,
      };
}

// True when the Form tab's "Online shop" section is filled in with a platform
// and the matching shop code or address.
export function hasShop(customFields: string | null): boolean {
  const f = parseCustomFields(customFields);
  const platform = (f.Platform || "").toLowerCase();
  if (platform === "shopify") return !!f.ShopifyShopName;
  if (platform === "woocommerce") return !!(f.FeedURL || f.WebsiteURL || f.ItemWeb);
  return false;
}

// The shop attached to any page (a member's own page), or null.
export async function getPageShop(page: ProducerRow): Promise<ShopProducer | null> {
  if (!hasShop(page.customFields)) return null;
  const producer = await toProducer(page);
  return producer.products.length > 0 ? producer : null;
}

// One producer by page slug (the Buy Panel widget), with live products.
export async function getShopProducer(slug: string): Promise<ShopProducer | null> {
  const row = await prisma.page.findFirst({
    where: { slug, status: "PUBLISHED", linkedPageId: null },
    select: { id: true, slug: true, title: true, subtitle: true, bodyContent: true, heroImageUrl: true, customFields: true },
  });
  return row ? toProducer(row) : null;
}

export async function getShopProducers(rootSlug: string): Promise<ShopProducer[]> {
  const all = await prisma.page.findMany({
    where: {
      status: "PUBLISHED",
      linkedPageId: null,
      OR: [
        { slug: { startsWith: `${rootSlug}/` }, customFields: { contains: "sz.touristitem" } },
        // Any member whose Form tab has an online shop switched on also appears.
        { customFields: { contains: "\"key\":\"Platform\"" } },
      ],
    },
    select: { id: true, slug: true, title: true, subtitle: true, bodyContent: true, heroImageUrl: true, customFields: true },
    orderBy: { sortOrder: "asc" },
  });
  const rows = all.filter((r) => r.slug.startsWith(`${rootSlug}/`) || hasShop(r.customFields));

  // Kentico left a duplicate "-1" copy of most producers — keep one per name.
  const byName = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const key = r.title.trim().toLowerCase();
    const existing = byName.get(key);
    if (!existing || (r.customFields?.length ?? 0) > (existing.customFields?.length ?? 0)) byName.set(key, r);
  }

  const producers = await Promise.all([...byName.values()].map(toProducer));

  // Producers with live products first, then alphabetical.
  return producers.sort((a, b) => b.products.length - a.products.length || a.title.localeCompare(b.title));
}
