import { auth } from "@/lib/auth";
import { getMemberEnquiries } from "@/lib/data/member";
import { HandledToggle } from "./handled-toggle";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const session = await auth();
  const enquiries = await getMemberEnquiries(session!.user.id, 200);

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-deep-green">Enquiries</h1>
      <p className="mt-1 mb-5 max-w-2xl text-sm text-neutral-600">
        Messages sent from your listing pages on the Visit Somerset site. Reply to the visitor directly by email or
        phone, then mark it as dealt with.
      </p>

      {enquiries.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-sm text-neutral-500">
          No enquiries yet. When a visitor sends one from one of your listing pages it will appear here.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {enquiries.map((e) => (
            <div key={e.id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-serif text-base font-semibold text-deep-green">
                    {e.name}
                    {!e.handled && <span className="ml-2 rounded-full bg-damson/10 px-2 py-0.5 text-[10px] font-bold text-damson">NEW</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    About {e.listingTitle} ·{" "}
                    {e.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <HandledToggle id={e.id} handled={e.handled} />
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                <div>
                  <dt className="inline text-neutral-500">Email: </dt>
                  <dd className="inline">
                    <a href={`mailto:${e.email}`} className="font-medium text-somerset-green hover:underline">
                      {e.email}
                    </a>
                  </dd>
                </div>
                {e.phone && (
                  <div>
                    <dt className="inline text-neutral-500">Phone: </dt>
                    <dd className="inline">
                      <a href={`tel:${e.phone.replace(/\s+/g, "")}`} className="font-medium text-somerset-green hover:underline">
                        {e.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {(e.checkIn || e.checkOut) && (
                  <div>
                    <dt className="inline text-neutral-500">Dates: </dt>
                    <dd className="inline">{[e.checkIn, e.checkOut].filter(Boolean).join(" to ")}</dd>
                  </div>
                )}
                {e.guests && (
                  <div>
                    <dt className="inline text-neutral-500">Guests: </dt>
                    <dd className="inline">{e.guests}</dd>
                  </div>
                )}
              </dl>
              {e.message && <p className="mt-3 whitespace-pre-wrap rounded-md bg-cool-grey p-3 text-sm">{e.message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
