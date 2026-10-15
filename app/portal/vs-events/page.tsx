import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { daysAgo } from "@/lib/data/views";
import { VsEventRegister } from "@/components/portal/vs-event-register";

export const dynamic = "force-dynamic";

function when(start: Date, end: Date | null) {
  const day = start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
  const t = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" });
  return `${day}, ${t(start)}${end ? ` to ${t(end)}` : ""}`;
}

export default async function VsEventsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const events = await prisma.vsEvent.findMany({
    where: { published: true, startsAt: { gte: daysAgo(0) } },
    orderBy: { startsAt: "asc" },
    take: 50,
    include: { registrations: { select: { userId: true } } },
  });

  return (
    <div className="max-w-4xl">
      <h1 className="font-serif text-3xl font-black text-stone-900">Visit Somerset events</h1>
      <p className="mt-1 text-stone-600">Networking, training and updates from the Visit Somerset team, for members.</p>

      {events.length === 0 ? (
        <p className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 text-sm text-stone-500">
          No events are scheduled right now. Check back soon.
        </p>
      ) : (
        <div className="mt-8 space-y-4">
          {events.map((e) => {
            const registered = e.registrations.some((r) => r.userId === userId);
            const full = !!e.capacity && e.registrations.length >= e.capacity;
            return (
              <article key={e.id} className="rounded-3xl border border-stone-200 bg-white p-5">
                <h2 className="font-serif text-xl font-black text-stone-900">{e.title}</h2>
                <p className="mt-1 text-sm font-semibold text-somerset-green">{when(e.startsAt, e.endsAt)}</p>
                {e.location && <p className="text-sm text-stone-600">{e.location}</p>}
                {e.description && <p className="mt-2 text-sm whitespace-pre-line text-stone-700">{e.description}</p>}
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <VsEventRegister eventId={e.id} registered={registered} full={full} />
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-somerset-green underline">
                      Event details and tickets
                    </a>
                  )}
                  {e.capacity && (
                    <span className="text-xs text-stone-500">
                      {e.registrations.length} of {e.capacity} places taken
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
