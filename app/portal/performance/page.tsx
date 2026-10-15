import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clicksByPage, daysAgo, viewsByDay } from "@/lib/data/views";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const session = await auth();
  const userId = session!.user.id;
  const pages = await prisma.page.findMany({
    where: { assignedMemberId: userId, status: { not: "ARCHIVED" } },
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });
  const ids = pages.map((p) => p.id);
  const since = daysAgo(30);
  const [daily, clicks, enquiries, firstSeen] = await Promise.all([
    viewsByDay(ids, 30),
    clicksByPage(ids, 30),
    prisma.bookingRequest.groupBy({
      by: ["pageId"],
      where: { pageId: { in: ids }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.pageView.findFirst({ where: { pageId: { in: ids } }, orderBy: { day: "asc" }, select: { day: true } }),
  ]);

  const rows = pages.map((p) => {
    const d = daily[p.id] ?? [];
    const views = d.reduce((s, x) => s + x.views, 0);
    const last7 = d.slice(-7).reduce((s, x) => s + x.views, 0);
    const prev7 = d.slice(-14, -7).reduce((s, x) => s + x.views, 0);
    const enq = enquiries.find((e) => e.pageId === p.id)?._count._all ?? 0;
    return { ...p, d, views, last7, prev7, enq, c: clicks[p.id] };
  });
  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalEnq = rows.reduce((s, r) => s + r.enq, 0);
  const totalClicks = rows.reduce((s, r) => s + r.c.total, 0);

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-3xl font-black text-stone-900">Performance</h1>
      <p className="mt-1 mb-6 max-w-2xl text-stone-600">
        How many people have viewed your listings on visitsomerset.co.uk and how many sent you an enquiry, over the last 30 days.
        {firstSeen ? ` Counting began on ${new Date(firstSeen.day).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.` : " Counting has only just started, so figures will build up over the coming days."}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="font-serif text-3xl font-black">{totalViews.toLocaleString("en-GB")}</p>
          <p className="mt-1 text-sm text-stone-500">Listing views, last 30 days</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="font-serif text-3xl font-black">{totalEnq}</p>
          <p className="mt-1 text-sm text-stone-500">Enquiries, last 30 days</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-5">
          <p className="font-serif text-3xl font-black">{totalClicks}</p>
          <p className="mt-1 text-sm text-stone-500">Clicks to your website, booking, phone and email</p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {rows.map((r) => {
          const max = Math.max(1, ...r.d.map((x) => x.views));
          const trend = r.prev7 === 0 ? null : Math.round(((r.last7 - r.prev7) / r.prev7) * 100);
          return (
            <section key={r.id} className="rounded-3xl border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-serif text-xl font-black">{r.title}</h2>
                <p className="text-sm text-stone-600">
                  <strong>{r.views}</strong> views · <strong>{r.enq}</strong> enquir{r.enq === 1 ? "y" : "ies"}
                  {trend !== null && (
                    <span className={trend >= 0 ? "ml-2 text-somerset-green" : "ml-2 text-damson"}>
                      {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}% on the week before
                    </span>
                  )}
                </p>
              </div>
              <p className="mt-2 text-sm text-stone-600">
                Clicks: <strong>{r.c.web}</strong> website · <strong>{r.c.booking}</strong> booking · <strong>{r.c.phone}</strong> phone ·{" "}
                <strong>{r.c.email}</strong> email · <strong>{r.c.directions}</strong> directions
              </p>
              <div className="mt-4 flex h-24 items-end gap-1" aria-label="Views per day, last 30 days">
                {r.d.map((x) => (
                  <div key={x.day} title={`${x.day}: ${x.views}`} className="flex-1 rounded-t bg-somerset-green/70" style={{ height: `${Math.max(2, (x.views / max) * 100)}%` }} />
                ))}
              </div>
              <p className="mt-1 text-xs text-stone-400">Each bar is one day, oldest on the left.</p>
            </section>
          );
        })}
        {rows.length === 0 && <p className="rounded-3xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">No listings are assigned to you yet.</p>}
      </div>
    </div>
  );
}
