import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Site map | Visit Somerset",
  description: "Every section of the Visit Somerset website, with its main pages.",
};

// Read from the database on request (not at build time).
export const dynamic = "force-dynamic";

// A readable map of the site: the sections in the main menu, then the pages
// directly under each, so anyone can find their way without the menus.
export default async function SiteMapPage() {
  const roots = await prisma.page.findMany({
    where: { parentId: null, status: "PUBLISHED", linkedPageId: null, slug: { notIn: ["home", "site-map", "search", "page-not-found", "error", "robots", "google-sitemap"] } },
    select: { id: true, title: true, slug: true, customFields: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });
  // Only sections people are meant to find: in a menu, or with real children.
  const sections = roots.filter((r) => /"key":"MenuItemGroup","value":"(main|top|footer|sub)"/.test(r.customFields ?? "") || ["places-to-stay", "things-to-do", "festivals-events", "discover-somerset", "somerset-stories", "buy-someset", "book-experiences", "news", "bath", "taunton"].includes(r.slug));

  const groups = await Promise.all(
    sections.map(async (s) => ({
      ...s,
      children: await prisma.page.findMany({
        where: { parentId: s.id, status: "PUBLISHED", linkedPageId: null, NOT: { customFields: { contains: '"value":"sz.touristitem"' } } },
        select: { id: true, title: true, slug: true },
        orderBy: { sortOrder: "asc" },
        take: 30,
      }),
    })),
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-stone-500">
        <Link href="/" className="hover:underline">
          Home
        </Link>{" "}
        / Site map
      </nav>
      <h1 className="font-serif text-4xl font-black tracking-tight text-stone-900">Site map</h1>
      <p className="mt-2 text-stone-600">Every section of the site, with its main pages.</p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map((g) => (
          <section key={g.id}>
            <h2 className="font-serif text-xl font-black text-stone-900">
              <Link href={`/${g.slug}`} className="hover:text-somerset-green hover:underline">
                {g.title}
              </Link>
            </h2>
            {g.children.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {g.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/${c.slug}`} className="text-stone-700 hover:text-somerset-green hover:underline">
                      {c.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
