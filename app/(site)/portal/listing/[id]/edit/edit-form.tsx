"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Proposal, ProposalRoom } from "@/lib/data/change-requests";
import { saveChangeAction, withdrawChangeAction } from "@/app/(site)/portal/actions";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_ROOM: ProposalRoom = { name: "", description: "", imageUrl: "", priceLabel: "", features: "", bookingUrl: "" };

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h2 className="font-serif text-lg font-semibold text-deep-green">{title}</h2>
      {hint && <p className="mt-1 text-sm text-neutral-500">{hint}</p>}
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function EditForm({
  pageId,
  title,
  slug,
  published,
  live,
  initial,
  requestStatus,
  rejectionNote,
}: {
  pageId: string;
  title: string;
  slug: string;
  published: boolean;
  live: Proposal;
  initial: Proposal;
  requestStatus: string | null;
  rejectionNote: string | null;
}) {
  const router = useRouter();
  const [p, setP] = useState<Proposal>(initial);
  const [pending, start] = useTransition();

  const set = <K extends keyof Proposal>(key: K, value: Proposal[K]) => setP((cur) => ({ ...cur, [key]: value }));
  const text = (key: keyof Proposal) => ({
    value: p[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
  });

  const changedCount = useMemo(
    () => (Object.keys(live) as (keyof Proposal)[]).filter((k) => JSON.stringify(live[k]) !== JSON.stringify(p[k])).length,
    [live, p],
  );

  function run(submit: boolean) {
    start(async () => {
      const res = await saveChangeAction(pageId, p, submit);
      if (res.ok) {
        toast.success(res.message);
        router.push(submit ? `/portal/listing/${pageId}` : `/portal/listing/${pageId}/edit`);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function discard() {
    start(async () => {
      const res = await withdrawChangeAction(pageId);
      if (res.ok) {
        toast.success(res.message);
        setP(live);
        router.refresh();
      }
    });
  }

  function setRoom(i: number, patch: Partial<ProposalRoom>) {
    set(
      "rooms",
      p.rooms.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }

  return (
    <div className="grid gap-6">
      {requestStatus === "SUBMITTED" && (
        <div className="rounded-xl border border-damson/30 bg-damson/5 p-4 text-sm">
          Your previous changes are already with the team for approval. If you save or send again, they will be
          replaced by this version.
        </div>
      )}
      {rejectionNote && (
        <div className="rounded-xl border border-damson/30 bg-damson/5 p-4 text-sm">
          <p className="font-semibold text-damson">The team asked for another look:</p>
          <p className="mt-1">{rejectionNote}</p>
        </div>
      )}

      <Section title="Summary and description" hint="This is the text visitors read first.">
        <Field label="Tagline" hint="A few words, shown under the name.">
          <Input maxLength={300} {...text("tagline")} />
        </Field>
        <Field label="Short summary" hint="One or two sentences. Shown in search results and on cards.">
          <Textarea rows={3} maxLength={2000} {...text("subtitle")} />
        </Field>
        <Field label="Full description">
          <Textarea rows={10} maxLength={20000} {...text("bodyContent")} />
        </Field>
      </Section>

      <Section title="Photos">
        <Field label="Main photo">
          <MediaPickerField value={p.heroImageUrl} onChange={(u) => set("heroImageUrl", u)} />
        </Field>
        <Field label="Gallery" hint="Up to 24 photos. Add real photos of your business.">
          <div className="flex flex-wrap gap-3">
            {p.gallery.map((url, i) => (
              <MediaPickerField
                key={`${i}-${url}`}
                value={url}
                onChange={(u) =>
                  set(
                    "gallery",
                    u ? p.gallery.map((g, idx) => (idx === i ? u : g)) : p.gallery.filter((_, idx) => idx !== i),
                  )
                }
              />
            ))}
            <MediaPickerField value="" onChange={(u) => u && set("gallery", [...p.gallery, u].slice(0, 24))} />
          </div>
        </Field>
      </Section>

      <Section title="Contact" hint="Shown to visitors on your listing page.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <Input {...text("phone")} />
          </Field>
          <Field label="Email">
            <Input type="email" {...text("email")} />
          </Field>
          <Field label="Website">
            <Input {...text("website")} placeholder="https://" />
          </Field>
          <Field label="Facebook">
            <Input {...text("facebook")} placeholder="https://" />
          </Field>
          <Field label="Twitter / X">
            <Input {...text("twitter")} placeholder="https://" />
          </Field>
          <Field label="Instagram">
            <Input {...text("instagram")} placeholder="https://" />
          </Field>
        </div>
      </Section>

      <Section title="Booking" hint="Where visitors go to book. Rooms can each have their own link below.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Booking link">
            <Input {...text("bookingUrl")} placeholder="https://" />
          </Field>
          <Field label="Booking button text">
            <Input maxLength={40} {...text("bookingLabel")} placeholder="Book now" />
          </Field>
        </div>
      </Section>

      <Section title="Address">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Address line 1">
            <Input {...text("address1")} />
          </Field>
          <Field label="Address line 2">
            <Input {...text("address2")} />
          </Field>
          <Field label="Town">
            <Input {...text("town")} />
          </Field>
          <Field label="Postcode">
            <Input {...text("postcode")} />
          </Field>
        </div>
        <p className="text-xs text-neutral-500">The map pin is set by the team. Ask them if it needs moving.</p>
      </Section>

      <Section title="Opening times and prices">
        <Field label="Opening times">
          <Textarea rows={4} maxLength={4000} {...text("openingTimes")} />
        </Field>
        <Field label="Prices / admission">
          <Textarea rows={4} maxLength={4000} {...text("admission")} />
        </Field>
      </Section>

      <Section title="Rooms" hint="Accommodation only. Each room can have its own booking link; if left empty, your booking link above is used.">
        {p.rooms.map((r, i) => (
          <div key={i} className="grid gap-3 rounded-xl border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-deep-green">Room {i + 1}</p>
              <button
                type="button"
                onClick={() =>
                  set(
                    "rooms",
                    p.rooms.filter((_, idx) => idx !== i),
                  )
                }
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-red-600"
              >
                <Trash2 className="size-3.5" /> Remove
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Room name">
                <Input value={r.name} onChange={(e) => setRoom(i, { name: e.target.value })} />
              </Field>
              <Field label="Price" hint="For example: From £95 a night">
                <Input value={r.priceLabel} onChange={(e) => setRoom(i, { priceLabel: e.target.value })} />
              </Field>
              <Field label="Booking link for this room">
                <Input value={r.bookingUrl} onChange={(e) => setRoom(i, { bookingUrl: e.target.value })} placeholder="https://" />
              </Field>
              <Field label="Features" hint="Separate with commas: Sea view, Sleeps 4, Wi-Fi">
                <Input value={r.features} onChange={(e) => setRoom(i, { features: e.target.value })} />
              </Field>
            </div>
            <Field label="Description">
              <Textarea rows={3} value={r.description} onChange={(e) => setRoom(i, { description: e.target.value })} />
            </Field>
            <Field label="Photo">
              <MediaPickerField value={r.imageUrl} onChange={(u) => setRoom(i, { imageUrl: u })} />
            </Field>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" onClick={() => set("rooms", [...p.rooms, { ...EMPTY_ROOM }].slice(0, 30))}>
            <Plus className="size-4" /> Add a room
          </Button>
        </div>
      </Section>

      <div className="sticky bottom-0 -mx-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white/95 p-4 shadow-lg backdrop-blur">
        <p className="text-sm text-neutral-600">
          {changedCount === 0 ? "No changes from the live page yet." : `${changedCount} section${changedCount === 1 ? "" : "s"} changed from the live page.`}
        </p>
        <div className="flex flex-wrap gap-2">
          {published && (
            <Link href={`/${slug}`} target="_blank" className="inline-flex h-8 items-center rounded-lg border px-3 text-sm hover:bg-cool-grey">
              View live
            </Link>
          )}
          {requestStatus && (
            <Button type="button" variant="ghost" disabled={pending} onClick={discard}>
              Discard changes
            </Button>
          )}
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(false)}>
            Save draft
          </Button>
          <Button type="button" disabled={pending || changedCount === 0} onClick={() => run(true)} title={`Send ${title} changes for approval`}>
            Send for approval
          </Button>
        </div>
      </div>
    </div>
  );
}
