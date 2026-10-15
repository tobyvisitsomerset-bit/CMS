import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasCapability } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { eventbriteConfigured } from "@/lib/eventbrite";
import { VsEventsManager } from "@/components/cms/vs-events-manager";

export const dynamic = "force-dynamic";

export default async function VsEventsAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasCapability(session.user.roleKey, "members.manage")) {
    return <div className="flex h-full items-center justify-center text-sm text-neutral-400">You don&apos;t have access to member events.</div>;
  }
  const rows = await prisma.vsEvent.findMany({
    orderBy: { startsAt: "desc" },
    take: 200,
    include: { _count: { select: { registrations: true } } },
  });
  const events = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    startsAt: r.startsAt.toISOString(),
    endsAt: r.endsAt ? r.endsAt.toISOString() : "",
    location: r.location ?? "",
    url: r.url ?? "",
    capacity: r.capacity,
    source: r.source,
    published: r.published,
    registrations: r._count.registrations,
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="mb-1 text-xl font-semibold">Member events</h1>
        <p className="text-sm text-neutral-500">
          Visit Somerset events shown to members in the member portal under &ldquo;VS events&rdquo;. Add them here
          {eventbriteConfigured() ? ", or pull them from Eventbrite." : ". Eventbrite sync switches on once EVENTBRITE_TOKEN and EVENTBRITE_ORG_ID are set."}
        </p>
      </div>
      <VsEventsManager events={events} eventbriteReady={eventbriteConfigured()} />
    </div>
  );
}
