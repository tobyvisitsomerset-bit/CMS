import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberListings } from "@/lib/data/member";
import { getLandingOptions, placementsFor } from "@/lib/data/placements";
import { diffProposal, getActiveRequest, parseProposal, proposalFromPage } from "@/lib/data/change-requests";

export const dynamic = "force-dynamic";

export default async function PortalListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  const listing = (await getMemberListings(userId)).find((l) => l.id === id);
  if (!listing) notFound();

  const [page, request] = await Promise.all([
    prisma.page.findUnique({ where: { id }, include: { rooms: { orderBy: { sortOrder: "asc" } }, tags: { select: { name: true } } } }),
    getActiveRequest(id, userId),
  ]);
  const offers = await prisma.offer.findMany({ where: { pageId: id }, orderBy: { createdAt: "desc" } });
  const labels = Object.fromEntries((await getLandingOptions()).map((l) => [l.id, l.title]));
  const proposal = request ? parseProposal(request.proposal) : null;
  const changes = page && proposal ? diffProposal(proposalFromPage({ ...page, placements: await placementsFor(id) }), proposal, labels) : [];

  return (
    <div className="max-w-3xl">
      <Link href="/portal" className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900">
        <ArrowLeft className="size-4" /> My listings
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl font-bold text-deep-green">{listing.title}</h1>
        <span className="rounded-full bg-cool-grey px-2 py-0.5 text-xs font-semibold text-neutral-600">{listing.statusLabel}</span>
        {listing.tierLabel && <span className="rounded-full bg-damson/10 px-2 py-0.5 text-xs font-semibold text-damson">{listing.tierLabel} member</span>}
      </div>
      {listing.summary && <p className="mt-2 text-neutral-600">{listing.summary}</p>}

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link href={`/portal/listing/${id}/edit`} className="rounded-full bg-somerset-green px-4 py-2 font-medium text-white hover:opacity-90">
          {request ? "Continue editing" : "Edit listing"}
        </Link>
        {listing.status === "PUBLISHED" && (
          <Link href={`/${listing.slug}`} target="_blank" className="inline-flex items-center gap-1 rounded-full border bg-white px-4 py-2 hover:bg-cool-grey">
            View live page <ExternalLink className="size-4" />
          </Link>
        )}
      </div>

      {request && (
        <div className="mt-6 rounded-2xl border border-damson/30 bg-white p-5">
          <h2 className="font-serif text-lg font-semibold text-damson">
            {request.status === "SUBMITTED"
              ? "Your changes are with the team for approval"
              : request.status === "REJECTED"
                ? "The team asked for another look"
                : "You have unsent changes"}
          </h2>
          {request.status === "REJECTED" && request.note && (
            <p className="mt-2 rounded-md bg-damson/5 p-3 text-sm text-neutral-800">&ldquo;{request.note}&rdquo;</p>
          )}
          <p className="mt-2 text-sm text-neutral-600">
            {request.status === "SUBMITTED"
              ? "Your live page stays as it is until someone at Visit Somerset approves them."
              : "Nothing changes on the live page until you send them for approval and the team approves them."}
          </p>
          {changes.length > 0 && (
            <ul className="mt-3 list-disc pl-5 text-sm text-neutral-700">
              {changes.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-8 rounded-2xl border bg-white p-6">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-xl font-semibold text-deep-green">Offers on this listing</h2>
          <Link href={`/portal/submit/offer?listing=${id}`} className="text-sm font-semibold text-somerset-green hover:underline">
            + Add an offer
          </Link>
        </div>
        {offers.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">No offers yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {offers.map((o) => (
              <li key={o.id} className="rounded-xl border border-damson/20 bg-damson/5 p-3 text-sm">
                <strong>{o.title}</strong>
                {o.description && <span className="block text-neutral-700">{o.description}</span>}
                <span className="block text-xs text-neutral-500">
                  {o.validTo ? `Until ${o.validTo.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}` : "No end date"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6 rounded-2xl border bg-white p-6">
        <div className="flex items-end justify-between">
          <h2 className="font-serif text-xl font-semibold text-deep-green">Health score</h2>
          <p className="font-serif text-3xl font-bold text-somerset-green">{listing.strength.score}<span className="text-base text-neutral-500"> / 100 · {listing.strength.band}</span></p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-cool-grey">
          <div className="h-full rounded-full bg-somerset-green" style={{ width: `${listing.strength.score}%` }} />
        </div>
        <ul className="mt-5 space-y-3">
          {listing.strength.items.map((i) => (
            <li key={i.label} className="flex items-start gap-3 text-sm">
              {i.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-somerset-green" /> : <Circle className="mt-0.5 size-4 shrink-0 text-neutral-400" />}
              <span>
                <span className={i.done ? "text-neutral-500" : "font-medium"}>{i.label}</span>
                {!i.done && <span className="block text-xs text-neutral-500">{i.hint}</span>}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-neutral-500">
          A simple checklist of what a complete listing has. It is not a ranking and does not affect where you appear.
        </p>
      </div>
    </div>
  );
}
