import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberEnquiries, getMemberListings } from "@/lib/data/member";
import { MarkReadButton } from "@/components/portal/mark-read-button";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  PUBLISHED: "bg-somerset-green/10 text-somerset-green",
  PENDING_APPROVAL: "bg-damson/10 text-damson",
  DRAFT: "bg-neutral-100 text-neutral-600",
};

const CHANGE_LABEL: Record<string, string> = {
  DRAFT: "You have unsent changes",
  SUBMITTED: "Changes awaiting team approval",
  REJECTED: "Changes need another look",
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default async function PortalDashboard() {
  const session = await auth();
  const userId = session!.user.id;
  const [listings, enquiries, notices] = await Promise.all([
    getMemberListings(userId),
    getMemberEnquiries(userId, 5),
    prisma.notification.findMany({ where: { userId, read: false }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const first = (session!.user.name ?? "there").split(" ")[0];
  const newEnquiries = listings.reduce((n, l) => n + l.newEnquiryCount, 0);
  const waiting = listings.filter((l) => l.change === "SUBMITTED").length;

  return (
    <div>
      <h1 className="font-serif text-3xl font-bold text-deep-green">
        {greeting()}, {first}
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        {listings.length === 0
          ? "No listings are assigned to you yet. Please get in touch with the Visit Somerset team."
          : `You look after ${listings.length} listing${listings.length === 1 ? "" : "s"}${
              newEnquiries > 0 ? ` and have ${newEnquiries} new enquir${newEnquiries === 1 ? "y" : "ies"}` : ""
            }${waiting > 0 ? `; ${waiting} change${waiting === 1 ? " is" : "s are"} with the team for approval` : ""}.`}
      </p>

      {notices.length > 0 && (
        <div className="mt-5 rounded-xl border border-somerset-green/30 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-deep-green">Updates</h2>
            <MarkReadButton />
          </div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
            {notices.map((n) => (
              <li key={n.id}>{n.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold text-deep-green">Your listings</h2>
          <div className="flex flex-col gap-3">
            {listings.map((l) => (
              <div key={l.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  {l.heroImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.heroImageUrl} alt="" className="h-[70px] w-24 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-[70px] w-24 shrink-0 items-center justify-center rounded-md bg-cool-grey text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                      No photo
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/portal/listing/${l.id}`} className="font-serif text-base font-semibold text-deep-green hover:underline">
                        {l.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[l.status] ?? STATUS_STYLE.DRAFT}`}>
                        {l.statusLabel}
                      </span>
                      {l.tierLabel && <span className="rounded-full bg-cool-grey px-2 py-0.5 text-[11px] font-medium text-neutral-600">{l.tierLabel} member</span>}
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {[l.town, `${l.strength.score}% complete`, l.enquiryCount > 0 ? `${l.enquiryCount} enquir${l.enquiryCount === 1 ? "y" : "ies"}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {l.change && <p className="mt-1 text-xs font-medium text-damson">{CHANGE_LABEL[l.change]}</p>}
                    <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-cool-grey">
                      <div className="h-full rounded-full bg-somerset-green" style={{ width: `${l.strength.score}%` }} />
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 text-sm">
                    {l.status === "PUBLISHED" && (
                      <Link href={`/${l.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 hover:bg-cool-grey">
                        View live <ExternalLink className="size-3.5" />
                      </Link>
                    )}
                    <Link href={`/portal/listing/${l.id}/edit`} className="rounded-full bg-somerset-green px-3 py-1.5 font-medium text-white hover:opacity-90">
                      Edit listing
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-deep-green">Enquiries</h3>
              <Link href="/portal/enquiries" className="text-xs font-semibold text-somerset-green hover:underline">
                All enquiries
              </Link>
            </div>
            {enquiries.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">Nothing yet. Enquiries sent from your listing pages appear here.</p>
            ) : (
              <ul className="mt-3 divide-y">
                {enquiries.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <p className="text-sm font-semibold text-deep-green">
                      {e.name}
                      {!e.handled && <span className="ml-2 rounded-full bg-damson/10 px-1.5 py-0.5 text-[10px] font-bold text-damson">NEW</span>}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {e.listingTitle} · {e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {listings.length > 0 &&
            (() => {
              const weakest = [...listings].sort((a, b) => a.strength.score - b.strength.score)[0];
              return (
                <div className="rounded-2xl border bg-white p-5">
                  <h3 className="font-serif text-lg font-semibold text-deep-green">Make your listing stronger</h3>
                  <p className="mt-1 text-xs text-neutral-500">
                    {weakest.title}: {weakest.strength.score}% complete
                  </p>
                  <ul className="mt-3 space-y-2">
                    {weakest.strength.items.map((i) => (
                      <li key={i.label} className="flex items-start gap-2 text-sm">
                        {i.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-somerset-green" /> : <Circle className="mt-0.5 size-4 shrink-0 text-neutral-400" />}
                        <span className={i.done ? "text-neutral-500" : "text-neutral-900"}>{i.label}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/portal/listing/${weakest.id}/edit`}
                    className="mt-4 block rounded-full bg-somerset-green px-3 py-2 text-center text-sm font-medium text-white hover:opacity-90"
                  >
                    Complete your listing
                  </Link>
                </div>
              );
            })()}
        </aside>
      </div>
    </div>
  );
}
