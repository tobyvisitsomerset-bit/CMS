import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLACEMENTS, bookableWeeks, placementByKey, formatPence } from "@/lib/ad-spaces";
import { SpacesBooker } from "@/components/portal/spaces-booker";
import { CancelBookingButton } from "@/components/portal/cancel-booking-button";

export const dynamic = "force-dynamic";

export default async function SpacesPage() {
  const session = await auth();
  const userId = session!.user.id;
  const weeks = bookableWeeks();

  const [listings, taken, mine] = await Promise.all([
    prisma.page.findMany({
      where: { assignedMemberId: userId, status: "PUBLISHED" },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
    prisma.adSlotBooking.findMany({
      where: { weekStart: { in: weeks }, status: { not: "CANCELLED" } },
      select: { placement: true, weekStart: true, memberId: true },
    }),
    prisma.adSlotBooking.findMany({ where: { memberId: userId, status: { not: "CANCELLED" } }, orderBy: { createdAt: "desc" } }),
  ]);

  // free[placement][week] = slots still available; yours[placement][week] = you hold one.
  const free: Record<string, Record<string, number>> = {};
  const yours: Record<string, Record<string, boolean>> = {};
  for (const p of PLACEMENTS) {
    free[p.key] = {};
    yours[p.key] = {};
    for (const w of weeks) {
      const rows = taken.filter((t) => t.placement === p.key && t.weekStart === w);
      free[p.key][w] = Math.max(0, p.slots - rows.length);
      yours[p.key][w] = rows.some((r) => r.memberId === userId);
    }
  }

  const byRef = new Map<string, typeof mine>();
  for (const m of mine) byRef.set(m.ref, [...(byRef.get(m.ref) ?? []), m]);

  return (
    <div>
      <p className="text-xs text-stone-500">Portal / Bookable spaces</p>
      <h1 className="font-serif text-4xl font-black tracking-tight text-stone-900">Book advertising space</h1>
      <p className="mt-1 max-w-3xl text-stone-600">
        Featured placement on a Visit Somerset page: your listing sits at the top of the page with a Featured ribbon. Sold by the week,
        Monday to Sunday, three slots per page. Minimum booking is one week.
      </p>

      {listings.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          You need a live listing to promote before you can book space.
        </p>
      ) : (
        <SpacesBooker
          listings={listings}
          weeks={weeks}
          placements={PLACEMENTS.map((p) => ({ key: p.key, label: p.label, pence: p.weekPencePrice, slots: p.slots }))}
          free={free}
          yours={yours}
        />
      )}

      <section className="mt-12">
        <h2 className="font-serif text-2xl font-black">Your bookings</h2>
        {byRef.size === 0 ? (
          <p className="mt-3 text-sm text-stone-500">Nothing booked yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {[...byRef.entries()].map(([ref, rows]) => {
              const places = [...new Set(rows.map((r) => placementByKey(r.placement)?.label ?? r.placement))];
              const wk = [...new Set(rows.map((r) => r.weekStart))].sort();
              const total = rows.reduce((s, r) => s + r.pricePence, 0);
              const status = rows[0].status;
              return (
                <div key={ref} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-stone-200 bg-white p-4">
                  <div>
                    <p className="font-serif text-lg font-black">
                      {ref}{" "}
                      <span
                        className={`ml-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          status === "CONFIRMED" ? "bg-somerset-green/10 text-somerset-green" : "bg-damson/10 text-damson"
                        }`}
                      >
                        {status === "CONFIRMED" ? "Confirmed" : "Awaiting confirmation"}
                      </span>
                    </p>
                    <p className="text-sm text-stone-600">
                      {places.join(", ")} · weeks from {wk.join(", ")}
                    </p>
                    <p className="text-xs text-stone-500">{formatPence(total)} before discount and VAT</p>
                  </div>
                  {status === "REQUESTED" && <CancelBookingButton refCode={ref} />}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
