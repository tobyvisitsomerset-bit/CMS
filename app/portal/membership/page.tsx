import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LEVELS_BY_PRIORITY, LEVEL_LABEL, LEVEL_PRIORITY, toLevel } from "@/lib/membership";

export const dynamic = "force-dynamic";

const WHAT: Record<string, string> = {
  PREMIUM: "Listed first in search results and the pinned Featured member placement on its section pages.",
  PARTNER: "Listed above Growth members in search results.",
  GROWTH: "A full member listing on visitsomerset.co.uk.",
};

export default async function MembershipPage() {
  const session = await auth();
  const pages = await prisma.page.findMany({
    where: { assignedMemberId: session!.user.id, status: { not: "ARCHIVED" } },
    select: { id: true, title: true, membershipTier: true },
    orderBy: { title: "asc" },
  });

  const offers = await prisma.offer.findMany({ where: { pageId: { in: pages.map((p) => p.id) } }, orderBy: { createdAt: "desc" } });

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl font-black text-stone-900">Membership</h1>
      <p className="mt-1 mb-6 text-stone-600">
        Your membership level is set by the Visit Somerset team, and it decides where your listing sits in search results.
      </p>

      <div className="space-y-3">
        {pages.map((p) => {
          const level = toLevel(p.membershipTier);
          return (
            <div key={p.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-serif text-xl font-black">{p.title}</h2>
                <span className="rounded-full bg-damson/10 px-3 py-1 text-xs font-bold text-damson">
                  {level ? `${LEVEL_LABEL[level]} · priority ${LEVEL_PRIORITY[level]}` : "No membership level set"}
                </span>
              </div>
              {level && <p className="mt-2 text-sm text-stone-600">{WHAT[level]}</p>}
              {offers.filter((o) => o.pageId === p.id).length > 0 && (
                <div className="mt-3 border-t border-stone-100 pt-3">
                  <p className="text-xs font-semibold tracking-wider text-stone-500 uppercase">Your offers</p>
                  <ul className="mt-1 space-y-1 text-sm text-stone-700">
                    {offers
                      .filter((o) => o.pageId === p.id)
                      .map((o) => (
                        <li key={o.id}>{o.title}</li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {pages.length === 0 && <p className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">No listings are assigned to you yet.</p>}
      </div>

      <div className="mt-8 rounded-3xl bg-stone-100 p-6">
        <h2 className="font-serif text-lg font-black">The three levels</h2>
        <ul className="mt-3 space-y-2 text-sm text-stone-700">
          {LEVELS_BY_PRIORITY.map((l) => (
            <li key={l}>
              <strong>{LEVEL_LABEL[l]}</strong> (priority {LEVEL_PRIORITY[l]}): {WHAT[l]}
            </li>
          ))}
        </ul>
        <Link href="/contact-us" className="mt-4 inline-block rounded-full bg-somerset-green px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
          Ask the team about upgrading
        </Link>
      </div>
    </div>
  );
}
