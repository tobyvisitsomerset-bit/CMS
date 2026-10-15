import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberEnquiries, getMemberListings } from "@/lib/data/member";
import { MarkReadButton } from "@/components/portal/mark-read-button";
import { WithdrawButton } from "@/components/portal/withdraw-button";
import { viewsByDay } from "@/lib/data/views";

export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const STATUS_BADGE: Record<string, string> = {
  PUBLISHED: "bg-somerset-green/10 text-somerset-green",
  DRAFT: "bg-stone-100 text-stone-600",
  PENDING_APPROVAL: "bg-damson/10 text-damson",
};

function Stat({ value, label, tone }: { value: string; label: string; tone?: "pink" }) {
  return (
    <div className={tone === "pink" ? "rounded-3xl bg-damson/10 p-5" : "rounded-3xl border border-stone-200 bg-white p-5"}>
      <p className="font-serif text-3xl font-black text-stone-900">{value}</p>
      <p className="mt-1 text-sm text-stone-500">{label}</p>
    </div>
  );
}

export default async function PortalDashboard() {
  const session = await auth();
  const userId = session!.user.id;
  const [listings, enquiries, notices] = await Promise.all([
    getMemberListings(userId),
    getMemberEnquiries(userId, 4),
    prisma.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const daily = await viewsByDay(listings.map((l) => l.id), 30);
  const views30 = Object.values(daily).reduce((s, d) => s + d.reduce((x, y) => x + y.views, 0), 0);
  const first = (session!.user.name ?? "there").split(" ")[0];
  const live = listings.filter((l) => l.status === "PUBLISHED").length;
  const waiting = listings.filter((l) => l.change === "SUBMITTED").length;
  const newEnquiries = listings.reduce((n, l) => n + l.newEnquiryCount, 0);
  const tier = listings.find((l) => l.tierLabel)?.tierLabel;
  const focus = [...listings].sort((a, b) => a.strength.score - b.strength.score)[0];

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.18em] text-stone-500 uppercase">
        {tier ? `${tier} member` : "Visit Somerset member"}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="mt-1 font-serif text-4xl font-black tracking-tight text-stone-900">
          {greeting()}, {first}
        </h1>
        <div className="flex gap-2 text-sm font-bold">
          <Link href="/portal/submit/event" className="rounded-full border border-stone-300 bg-white px-4 py-2 hover:bg-stone-50">
            + Add an event
          </Link>
          <Link href="/portal/submit/listing" className="rounded-full bg-somerset-green px-4 py-2 text-white hover:opacity-90">
            + New listing
          </Link>
        </div>
      </div>
      <p className="mt-1 text-stone-600">
        {listings.length === 0
          ? "No listings are assigned to you yet. Please get in touch with the Visit Somerset team."
          : `You look after ${listings.length} listing${listings.length === 1 ? "" : "s"}. ${
              waiting > 0
                ? `${waiting} change${waiting === 1 ? " is" : "s are"} waiting for approval.`
                : "Everything you have sent has been dealt with."
            }`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat value={views30.toLocaleString("en-GB")} label="Listing views, last 30 days" />
        <Stat value={String(live)} label={`Live of ${listings.length} listing${listings.length === 1 ? "" : "s"}`} />
        <Stat value={String(newEnquiries)} label="New enquiries" />
        <Stat value={String(waiting)} label="Change awaiting approval" tone="pink" />
      </div>

      {notices.length > 0 && (
        <div className="mt-6 rounded-3xl border border-somerset-green/30 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-black">Updates from the team</h2>
            <MarkReadButton />
          </div>
          <ul className="mt-2 space-y-1 text-sm text-stone-700">
            {notices.map((n) => (
              <li key={n.id}>{n.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section>
          <h2 className="font-serif text-2xl font-black text-stone-900">Listings assigned to you</h2>
          <div className="mt-4 space-y-3">
            {listings.map((l) => {
              const awaiting = l.change === "SUBMITTED";
              const badge = awaiting ? "Awaiting approval" : l.statusLabel;
              return (
                <div
                  key={l.id}
                  className={`flex flex-col gap-4 rounded-3xl border bg-white p-4 sm:flex-row sm:items-center ${
                    awaiting ? "border-damson/50" : "border-stone-200"
                  }`}
                >
                  {l.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.heroImageUrl} alt="" className="h-20 w-28 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-[10px] font-semibold tracking-wider text-stone-400 uppercase">
                      Photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/portal/listing/${l.id}`} className="font-serif text-lg font-black text-stone-900 hover:underline">
                        {l.title}
                      </Link>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          awaiting ? STATUS_BADGE.PENDING_APPROVAL : (STATUS_BADGE[l.status] ?? STATUS_BADGE.DRAFT)
                        }`}
                      >
                        {badge}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-500">
                      {[
                        l.section,
                        l.town,
                        `updated ${l.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`,
                        `Health score ${l.strength.score}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {l.change === "REJECTED" && <p className="mt-1 text-sm font-medium text-damson">The team asked for another look.</p>}
                    {l.change === "DRAFT" && <p className="mt-1 text-sm font-medium text-damson">You have unsent changes.</p>}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 text-sm font-semibold">
                    {awaiting ? (
                      <>
                        <Link href={`/portal/listing/${l.id}`} className="rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-50">
                          See changes
                        </Link>
                        <WithdrawButton pageId={l.id} />
                      </>
                    ) : l.status !== "PUBLISHED" ? (
                      <Link href={`/portal/listing/${l.id}/edit`} className="rounded-full bg-somerset-green px-4 py-2 text-white hover:opacity-90">
                        Finish listing
                      </Link>
                    ) : (
                      <>
                        <Link href={`/${l.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border border-stone-300 px-4 py-2 hover:bg-stone-50">
                          View live <ExternalLink className="size-3.5" />
                        </Link>
                        <Link href={`/portal/listing/${l.id}/edit`} className="rounded-full bg-somerset-green px-4 py-2 text-white hover:opacity-90">
                          Edit
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5">
          {focus && (
            <div className="rounded-3xl border border-stone-200 bg-white p-5">
              <h3 className="font-serif text-lg font-black">Health score</h3>
              <p className="mt-1 text-xs text-stone-500">{focus.title}</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-somerset-green" style={{ width: `${focus.strength.score}%` }} />
              </div>
              <p className="mt-1.5 text-sm font-semibold text-stone-800">
                {focus.strength.score} out of 100 · {focus.strength.band}
              </p>
              <p className="mt-3 text-xs font-semibold tracking-wider text-stone-500 uppercase">Quickest ways to improve it</p>
              <ul className="mt-2 space-y-2">
                {focus.strength.recommendations.length === 0 && <li className="text-sm text-stone-600">Nothing to add. Great work.</li>}
                {focus.strength.recommendations.map((r) => (
                  <li key={r.key} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 shrink-0 rounded-full bg-somerset-green/10 px-1.5 py-0.5 text-[11px] font-bold text-somerset-green">
                      +{r.max - r.earned}
                    </span>
                    <span className="text-stone-800">{r.hint}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={`/portal/listing/${focus.id}/edit`}
                className="mt-4 block rounded-full bg-somerset-green px-4 py-2.5 text-center text-sm font-bold text-white hover:opacity-90"
              >
                Complete your listing
              </Link>
            </div>
          )}

          <div className="rounded-3xl border border-stone-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-black">Enquiries</h3>
              <Link href="/portal/enquiries" className="text-xs font-semibold text-somerset-green hover:underline">
                All enquiries
              </Link>
            </div>
            {enquiries.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">Nothing yet. Enquiries sent from your listing pages appear here.</p>
            ) : (
              <ul className="mt-3 divide-y divide-stone-100">
                {enquiries.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="text-sm font-semibold text-stone-900">
                      {e.name}
                      {!e.handled && <span className="ml-2 rounded-full bg-damson/10 px-1.5 py-0.5 text-[10px] font-bold text-damson">NEW</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {e.listingTitle} · {e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5">
            <h3 className="font-serif text-lg font-black">Where you appear</h3>
            <p className="mt-1 text-sm text-stone-600">Pick the landing pages your listing shows on, like Animals or Family fun.</p>
            <Link href="/portal/appear" className="mt-3 inline-block rounded-full bg-somerset-green px-4 py-2 text-sm font-bold text-white hover:opacity-90">
              Choose where you appear
            </Link>
          </div>

          <div className="rounded-3xl bg-somerset-green p-5 text-white">
            <h3 className="font-serif text-lg font-black">Bookable spaces</h3>
            <p className="mt-1 text-sm text-white/90">
              Put your listing at the top of a Visit Somerset page, sold by the week with a Featured ribbon.
            </p>
            <Link href="/portal/spaces" className="mt-3 inline-block rounded-full bg-white px-4 py-2 text-sm font-bold text-somerset-green hover:opacity-90">
              Book advertising space
            </Link>
          </div>

          <div className="rounded-3xl bg-stone-100 p-5">
            <h3 className="font-serif text-lg font-black">Need a hand?</h3>
            <p className="mt-1 text-sm text-stone-600">The Visit Somerset membership team can help with your listing or your membership.</p>
            <Link href="/contact-us" className="mt-3 inline-block rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-50">
              Contact the team
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
