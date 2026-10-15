import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PhotosPage() {
  const session = await auth();
  const pages = await prisma.page.findMany({
    where: { assignedMemberId: session!.user.id, status: { not: "ARCHIVED" } },
    select: { id: true, title: true, heroImageUrl: true, galleryUrls: true },
    orderBy: { title: "asc" },
  });

  const listings = pages.map((p) => {
    let gallery: string[] = [];
    try {
      const g = p.galleryUrls ? JSON.parse(p.galleryUrls) : [];
      gallery = Array.isArray(g) ? g : [];
    } catch {
      gallery = [];
    }
    return { id: p.id, title: p.title, photos: [p.heroImageUrl, ...gallery].filter((u): u is string => !!u) };
  });

  return (
    <div>
      <h1 className="font-serif text-3xl font-black text-stone-900">Photos</h1>
      <p className="mt-1 mb-6 max-w-2xl text-stone-600">
        The photos on each of your listings. Photos added or changed here go to the team for approval like any other change.
      </p>

      {listings.length === 0 ? (
        <p className="rounded-3xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-500">No listings are assigned to you yet.</p>
      ) : (
        <div className="space-y-6">
          {listings.map((l) => (
            <section key={l.id} className="rounded-3xl border border-stone-200 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-serif text-xl font-black">
                  {l.title} <span className="text-sm font-normal text-stone-500">· {l.photos.length} photo{l.photos.length === 1 ? "" : "s"}</span>
                </h2>
                <Link href={`/portal/listing/${l.id}/edit`} className="rounded-full bg-somerset-green px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                  Edit photos
                </Link>
              </div>
              {l.photos.length === 0 ? (
                <p className="mt-4 text-sm text-stone-500">No photos yet. Listings with photos get far more attention from visitors.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {l.photos.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${u}-${i}`} src={u} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
