import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CollectionsManager } from "./collections-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "My collections | Visit Somerset" };

export default async function CollectionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rows = await prisma.collection.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { items: { orderBy: { addedAt: "desc" } } },
  });
  const pageIds = Array.from(new Set(rows.flatMap((c) => c.items.map((i) => i.pageId))));
  const pages = await prisma.page.findMany({
    where: { id: { in: pageIds } },
    select: { id: true, title: true, slug: true, heroImageUrl: true, status: true },
  });
  const byId = new Map(pages.map((p) => [p.id, p]));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">My account</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">My collections</h1>
      <p className="mt-1 text-stone-600">
        Group places you like into collections, such as &ldquo;Rainy day ideas&rdquo; or &ldquo;Anniversary weekend&rdquo;. Add places from
        any listing page with <strong>Add to a collection</strong>. Share a collection with a link when you are ready.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/account" className="font-semibold text-somerset-green hover:underline">
          Back to my account
        </Link>
      </p>
      <CollectionsManager
        collections={rows.map((c) => ({
          id: c.id,
          name: c.name,
          token: c.token,
          isShared: c.isShared,
          items: c.items
            .map((i) => byId.get(i.pageId))
            .filter((p): p is NonNullable<typeof p> => !!p && p.status === "PUBLISHED")
            .map((p) => ({ id: p.id, title: p.title, slug: p.slug, imageUrl: p.heroImageUrl })),
        }))}
      />
    </div>
  );
}
