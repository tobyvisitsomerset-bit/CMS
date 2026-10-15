import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const c = await prisma.collection.findUnique({ where: { token }, select: { name: true, isShared: true } });
  return { title: c?.isShared ? `${c.name} | Visit Somerset` : "Collection", robots: { index: false, follow: false } };
}

// A collection someone chose to share. Unlisted: only reachable by its link,
// and it never shows who made it.
export default async function SharedCollectionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const c = await prisma.collection.findUnique({ where: { token }, include: { items: { orderBy: { addedAt: "desc" } } } });
  if (!c || !c.isShared) notFound();

  const pages = await prisma.page.findMany({
    where: { id: { in: c.items.map((i) => i.pageId) }, status: "PUBLISHED" },
    select: { id: true, title: true, slug: true, subtitle: true, heroImageUrl: true },
  });
  const order = new Map(c.items.map((i, idx) => [i.pageId, idx]));
  pages.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">A Somerset collection</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">{c.name}</h1>
      <p className="mt-1 text-stone-600">
        {pages.length} place{pages.length === 1 ? "" : "s"} picked on visitsomerset.co.uk.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pages.map((p) => (
          <Link key={p.id} href={`/${p.slug}`} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white">
            {p.heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.heroImageUrl} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-cool-grey text-[11px] font-semibold tracking-wider text-stone-400 uppercase">Photo</div>
            )}
            <div className="p-4">
              <p className="font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{p.title}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 rounded-3xl bg-cool-grey p-6">
        <p className="font-serif text-xl font-black">Make your own</p>
        <p className="mt-1 text-sm text-stone-600">Save the places you like and plan a whole trip around them.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/account/sign-up" className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
            Create a free account
          </Link>
          <Link href="/plan" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
            Build an itinerary
          </Link>
        </div>
      </div>
    </div>
  );
}
