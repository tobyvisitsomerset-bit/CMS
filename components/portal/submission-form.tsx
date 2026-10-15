"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSubmissionAction, deleteSubmissionAction } from "@/app/portal/actions";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LISTING_SECTIONS } from "@/lib/submission-meta";
import type { EventData, ListingData, OfferData, SubmissionKind } from "@/lib/data/submissions";

type Data = ListingData | EventData | OfferData;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-semibold text-stone-700">{label}</Label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function SubmissionForm({
  kind,
  initial,
  id,
  status,
  note,
  listings,
}: {
  kind: SubmissionKind;
  initial: Data;
  id: string | null;
  status: string | null;
  note: string | null;
  listings: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [d, setD] = useState<Record<string, string>>(initial as unknown as Record<string, string>);
  const [pending, start] = useTransition();
  const [savedId, setSavedId] = useState<string | null>(id);

  const bind = (key: string) => ({
    value: d[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setD((cur) => ({ ...cur, [key]: e.target.value })),
  });

  function run(submit: boolean) {
    start(async () => {
      const res = await saveSubmissionAction(kind, d, submit, savedId);
      if (res.ok) {
        toast.success(res.message);
        setSavedId(res.id);
        router.push(kind === "LISTING" ? "/portal" : kind === "EVENT" ? "/portal/events" : "/portal/offers");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function remove() {
    if (!savedId) return;
    start(async () => {
      await deleteSubmissionAction(savedId);
      toast.success("Draft deleted.");
      router.push(kind === "LISTING" ? "/portal" : kind === "EVENT" ? "/portal/events" : "/portal/offers");
      router.refresh();
    });
  }

  const selectCls =
    "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="space-y-4">
      {status === "REJECTED" && note && (
        <div className="rounded-2xl border border-damson/30 bg-damson/5 p-4 text-sm">
          <p className="font-semibold text-damson">The team asked for another look:</p>
          <p className="mt-1">{note}</p>
        </div>
      )}
      {status === "SUBMITTED" && (
        <div className="rounded-2xl border border-damson/30 bg-damson/5 p-4 text-sm">
          This is already with the team for approval. If you send it again it will be replaced by this version.
        </div>
      )}

      <div className="space-y-5 rounded-3xl border border-stone-200 bg-white p-6">
        {kind === "LISTING" && (
          <>
            <Field label="Listing name">
              <Input maxLength={120} {...bind("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Section">
                <select className={selectCls} {...bind("section")}>
                  {LISTING_SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Town">
                <Input maxLength={80} {...bind("town")} />
              </Field>
            </div>
            <Field label="Tagline" hint="A few words, shown under the name.">
              <Input maxLength={300} {...bind("tagline")} />
            </Field>
            <Field label="Short summary">
              <Textarea rows={3} maxLength={2000} {...bind("summary")} />
            </Field>
            <Field label="Description">
              <Textarea rows={8} maxLength={20000} {...bind("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone">
                <Input {...bind("phone")} />
              </Field>
              <Field label="Email">
                <Input type="email" {...bind("email")} />
              </Field>
              <Field label="Website">
                <Input placeholder="https://" {...bind("website")} />
              </Field>
              <Field label="Postcode">
                <Input {...bind("postcode")} />
              </Field>
            </div>
            <Field label="Address">
              <Input {...bind("address1")} />
            </Field>
            <Field label="Main photo">
              <MediaPickerField value={d.imageUrl ?? ""} onChange={(u) => setD((c) => ({ ...c, imageUrl: u }))} />
            </Field>
          </>
        )}

        {kind === "EVENT" && (
          <>
            <Field label="Event name">
              <Input maxLength={160} {...bind("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input type="date" {...bind("startDate")} />
              </Field>
              <Field label="Ends" hint="Leave blank for a one-day event.">
                <Input type="date" {...bind("endDate")} />
              </Field>
              <Field label="Venue">
                <Input maxLength={160} {...bind("venue")} />
              </Field>
              <Field label="Town">
                <Input maxLength={80} {...bind("town")} />
              </Field>
            </div>
            <Field label="Short description">
              <Textarea rows={3} maxLength={2000} {...bind("summary")} />
            </Field>
            <Field label="Full description">
              <Textarea rows={7} maxLength={20000} {...bind("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tickets or more information (web address)">
                <Input placeholder="https://" {...bind("link")} />
              </Field>
              <Field label="Price" hint="For example: Free, or £12 adults, £6 children">
                <Input maxLength={200} {...bind("price")} />
              </Field>
            </div>
            <Field label="Photo">
              <MediaPickerField value={d.imageUrl ?? ""} onChange={(u) => setD((c) => ({ ...c, imageUrl: u }))} />
            </Field>
          </>
        )}

        {kind === "OFFER" && (
          <>
            <Field label="Which listing is it for?">
              <select className={selectCls} {...bind("pageId")}>
                <option value="">Choose a listing</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Offer title" hint="For example: 10% off midweek stays">
              <Input maxLength={120} {...bind("title")} />
            </Field>
            <Field label="Details">
              <Textarea rows={4} maxLength={1000} {...bind("description")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Link (optional)">
                <Input placeholder="https://" {...bind("url")} />
              </Field>
              <Field label="From">
                <Input type="date" {...bind("validFrom")} />
              </Field>
              <Field label="Until">
                <Input type="date" {...bind("validTo")} />
              </Field>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(true)}
          className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
        >
          Submit for approval
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(false)}
          className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50"
        >
          Save draft
        </button>
        {savedId && (
          <button type="button" disabled={pending} onClick={remove} className="text-sm font-medium text-stone-500 hover:text-red-600 hover:underline">
            Delete this draft
          </button>
        )}
      </div>
    </div>
  );
}
