import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { signOutAction } from "@/app/cms/auth-actions";
import { ClaimItineraries } from "./claim-itineraries";
import { PasswordCard } from "./password-card";
import { ClubCard } from "./club-card";
import { mailerliteConfigured } from "@/lib/mailerlite";
import { getRecommendations } from "@/lib/data/recommendations";

export const dynamic = "force-dynamic";

export const metadata = { title: "My account | Visit Somerset" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.roleKey === "MEMBER") redirect("/portal");
  if (session.user.roleKey !== "VISITOR") redirect("/cms");

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { marketingOptIn: true } });
  const [recs, itineraries, trips] = await Promise.all([
    getRecommendations(session.user.id),
    prisma.itinerary.findMany({ where: { userId: session.user.id }, orderBy: { updatedAt: "desc" }, take: 30 }),
    prisma.userTrips.findUnique({ where: { userId: session.user.id } }),
  ]);
  let tripCount = 0;
  try {
    tripCount = trips ? (JSON.parse(trips.data).trips?.length ?? 0) : 0;
  } catch {
    tripCount = 0;
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <ClaimItineraries />
      <p className="text-[11px] font-semibold tracking-[0.18em] text-damson uppercase">My account</p>
      <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">Hello, {session.user.name?.split(" ")[0]}</h1>
      <p className="mt-1 text-stone-600">{session.user.email}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/plan" className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          Build a new itinerary
        </Link>
        <Link href="/account/collections" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
          My collections
        </Link>
        <Link href="/my-trip" className="rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
          Go to My Trip{tripCount > 0 ? ` (${tripCount} trip${tripCount === 1 ? "" : "s"})` : ""}
        </Link>
      </div>

      {recs.length > 0 && (
        <section className="mt-10">
          <h2 className="font-serif text-2xl font-black">Recommended for you</h2>
          <p className="text-sm text-stone-500">Based only on the interests you chose and the places you saved.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recs.map(({ item, reason }) => (
              <Link key={item.id} href={`/${item.slug}`} className="group overflow-hidden rounded-3xl border border-stone-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.imageUrl!} alt="" className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                <div className="p-4">
                  <p className="font-serif text-lg leading-tight font-black text-stone-900 group-hover:text-somerset-green">{item.title}</p>
                  <p className="text-xs text-stone-500">{item.town ?? ""}</p>
                  <p className="mt-1 text-xs font-semibold text-damson">{reason}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-serif text-2xl font-black">Your itineraries</h2>
        {itineraries.length === 0 ? (
          <p className="mt-3 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
            Nothing saved yet. Build one and press Save and share, and it will be here on any device you sign in on.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {itineraries.map((i) => (
              <Link
                key={i.id}
                href={`/plan/${i.token}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-3xl border border-stone-200 bg-white p-4 hover:border-somerset-green"
              >
                <span>
                  <strong className="font-serif text-lg font-black text-stone-900">{i.title}</strong>
                  <span className="block text-xs text-stone-500">
                    Saved {i.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </span>
                <span className="text-sm font-semibold text-somerset-green">Open</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 sm:grid-cols-2">
        <ClubCard joined={me?.marketingOptIn ?? false} configured={mailerliteConfigured()} />
        <PasswordCard />
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="font-serif text-xl font-black">Sign out</h2>
          <p className="mt-1 text-sm text-stone-600">Your trips and itineraries stay saved to your account.</p>
          <form action={signOutAction} className="mt-4">
            <button type="submit" className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
              Sign out
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
