import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveRequest, parseProposal } from "@/lib/data/change-requests";
import { getLandingOptions, homeLandingIds, placementCap, placementsFor } from "@/lib/data/placements";
import { levelLabel } from "@/lib/membership";
import { AppearCard } from "@/components/portal/appear-card";

export const dynamic = "force-dynamic";

export default async function AppearPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [pages, landings] = await Promise.all([
    prisma.page.findMany({
      where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, membershipTier: true },
      orderBy: { title: "asc" },
    }),
    getLandingOptions(),
  ]);

  const cards = await Promise.all(
    pages.map(async (p) => {
      const [live, home, active] = await Promise.all([placementsFor(p.id), homeLandingIds(p.id), getActiveRequest(p.id, userId)]);
      const proposal = active ? parseProposal(active.proposal) : null;
      const waiting = active?.status === "SUBMITTED";
      return {
        id: p.id,
        title: p.title,
        level: levelLabel(p.membershipTier),
        cap: placementCap(p.membershipTier),
        live,
        // What they last chose, if it is still waiting or only a draft.
        selected: proposal ? proposal.placements : live,
        waiting,
        home,
        options: landings.filter((l) => l.id !== p.id).map((l) => ({ id: l.id, title: l.title, context: l.context })),
      };
    }),
  );

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-3xl font-black text-stone-900">Where you appear</h1>
      <p className="mt-1 mb-6 max-w-2xl text-stone-600">
        Your listing always shows in its own section. Here you choose other landing pages it should appear on too, such as Animals or
        Family fun. Tick the ones you want and send it to us.
      </p>

      {cards.length === 0 ? (
        <p className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">No listings are assigned to you yet.</p>
      ) : (
        <div className="space-y-6">
          {cards.map((c) => (
            <AppearCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
