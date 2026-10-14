import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function EnquiriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasCapability(session.user.roleKey, "workflow.review")) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">You don&apos;t have access to enquiries.</div>;
  }

  const [requests, subscribers, subscriberCount] = await Promise.all([
    prisma.bookingRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.newsletterSubscriber.count(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10 p-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Enquiries</h1>
        <p className="text-sm text-neutral-500">
          Stay enquiries sent from listing pages on the public site, and newsletter signups from the footer. These are
          stored here — they aren&apos;t emailed automatically.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Stay enquiries ({requests.length})</h2>
          <Link href="/cms/enquiries/export?kind=requests" className="text-sm font-medium text-somerset-green hover:underline">
            Download CSV
          </Link>
        </div>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-neutral-400">No enquiries yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Listing</th>
                  <th className="px-3 py-2">From</th>
                  <th className="px-3 py-2">Dates / guests</th>
                  <th className="px-3 py-2">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-neutral-500">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/${r.pageSlug}`} className="font-medium text-somerset-green hover:underline" target="_blank">
                        {r.pageTitle}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <a href={`mailto:${r.email}`} className="text-neutral-500 hover:underline">
                        {r.email}
                      </a>
                      {r.phone && <div className="text-neutral-500">{r.phone}</div>}
                    </td>
                    <td className="px-3 py-2 text-neutral-600">
                      {[r.checkIn && r.checkOut ? `${r.checkIn} → ${r.checkOut}` : r.checkIn || r.checkOut, r.guests].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="max-w-xs px-3 py-2 text-neutral-600">{r.message || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Newsletter subscribers ({subscriberCount})</h2>
          <Link href="/cms/enquiries/export?kind=subscribers" className="text-sm font-medium text-somerset-green hover:underline">
            Download CSV
          </Link>
        </div>
        {subscribers.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-sm text-neutral-400">No subscribers yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subscribers.map((s) => (
                  <tr key={s.id}>
                    <td className="px-3 py-2">{s.email}</td>
                    <td className="px-3 py-2 text-neutral-500">{s.source ?? "—"}</td>
                    <td className="px-3 py-2 text-neutral-500">{fmt(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
