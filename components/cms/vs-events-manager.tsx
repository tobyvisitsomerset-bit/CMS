"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteVsEventAction, saveVsEventAction, syncEventbriteAction } from "@/app/cms/vs-events/actions";

type Ev = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  url: string;
  capacity: number | null;
  source: string;
  published: boolean;
  registrations: number;
};

type Draft = {
  id: string | null;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  location: string;
  url: string;
  capacity: string;
  published: boolean;
};

// <input type="datetime-local"> works in the editor's own time zone.
function toLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

const blank: Draft = { id: null, title: "", description: "", startsAt: "", endsAt: "", location: "", url: "", capacity: "", published: true };

export function VsEventsManager({ events, eventbriteReady }: { events: Ev[]; eventbriteReady: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, start] = useTransition();

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  function save() {
    if (!draft) return;
    start(async () => {
      const res = await saveVsEventAction({
        id: draft.id,
        title: draft.title,
        description: draft.description,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : "",
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : "",
        location: draft.location,
        url: draft.url,
        capacity: draft.capacity ? Number(draft.capacity) : null,
        published: draft.published,
      });
      if (res.ok) {
        toast.success("Event saved");
        setDraft(null);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove(ev: Ev) {
    if (!window.confirm(`Delete "${ev.title}"? Anyone registered will lose their place.`)) return;
    start(async () => {
      await deleteVsEventAction(ev.id);
      toast.success("Event deleted");
      router.refresh();
    });
  }

  function sync() {
    start(async () => {
      const res = await syncEventbriteAction();
      if (res.ok) toast.success(`Eventbrite: ${res.created} new, ${res.updated} updated`);
      else toast.error(res.error ?? "Could not sync.");
      router.refresh();
    });
  }

  const field = "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDraft({ ...blank })}>Add an event</Button>
        <Button variant="outline" disabled={!eventbriteReady || pending} onClick={sync} title={eventbriteReady ? "" : "Set EVENTBRITE_TOKEN and EVENTBRITE_ORG_ID first"}>
          Sync from Eventbrite
        </Button>
      </div>

      {draft && (
        <div className="space-y-3 rounded-lg border bg-neutral-50 p-4">
          <h2 className="text-base font-semibold">{draft.id ? "Edit event" : "New event"}</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Title</span>
            <input className={field} value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Starts</span>
              <input type="datetime-local" className={field} value={draft.startsAt} onChange={(e) => set({ startsAt: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Ends (optional)</span>
              <input type="datetime-local" className={field} value={draft.endsAt} onChange={(e) => set({ endsAt: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Where</span>
              <input className={field} value={draft.location} onChange={(e) => set({ location: e.target.value })} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Places (blank for unlimited)</span>
              <input type="number" min={1} className={field} value={draft.capacity} onChange={(e) => set({ capacity: e.target.value })} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Booking or details link (https://)</span>
            <input className={field} value={draft.url} onChange={(e) => set({ url: e.target.value })} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea rows={4} className={field} value={draft.description} onChange={(e) => set({ description: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.published} onChange={(e) => set({ published: e.target.checked })} />
            Show to members
          </label>
          <div className="flex gap-2">
            <Button disabled={pending} onClick={save}>
              {pending ? "Saving..." : "Save event"}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-sm text-neutral-400">No events yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Coming</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-3 py-2 whitespace-nowrap text-neutral-500">
                    {new Date(e.startsAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{e.title}</span>
                    {!e.published && <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[11px]">Hidden</span>}
                    {e.location && <span className="block text-xs text-neutral-500">{e.location}</span>}
                  </td>
                  <td className="px-3 py-2">
                    {e.registrations}
                    {e.capacity ? ` / ${e.capacity}` : ""}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{e.source === "eventbrite" ? "Eventbrite" : "Added here"}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button
                      type="button"
                      className="mr-3 font-medium text-somerset-green hover:underline"
                      onClick={() =>
                        setDraft({
                          id: e.id,
                          title: e.title,
                          description: e.description,
                          startsAt: toLocal(e.startsAt),
                          endsAt: toLocal(e.endsAt),
                          location: e.location,
                          url: e.url,
                          capacity: e.capacity ? String(e.capacity) : "",
                          published: e.published,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button type="button" className="font-medium text-red-700 hover:underline" onClick={() => remove(e)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
