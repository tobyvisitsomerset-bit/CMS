"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Proposal, ProposalRoom } from "@/lib/data/change-requests";
import { saveChangeAction, withdrawChangeAction } from "@/app/portal/actions";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { GalleryField } from "@/components/cms/media-library/gallery-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { PlacementsPicker, type PlacementOption } from "@/components/cms/placements-picker";
import { ACCESS_FEATURES } from "@/lib/accessibility";

const EMPTY_ROOM: ProposalRoom = { name: "", description: "", imageUrl: "", priceLabel: "", features: "", bookingUrl: "" };

type TabKey = "details" | "photos" | "hours" | "access" | "facilities" | "where" | "contact" | "address" | "rooms" | "spaces";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-semibold text-stone-700">{label}</Label>
      {children}
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function EditForm({
  pageId,
  title,
  slug,
  section,
  tierLabel,
  tagOptions,
  detectedAccess,
  landingOptions,
  homeIds,
  placementCap,
  published,
  live,
  initial,
  requestStatus,
  rejectionNote,
}: {
  pageId: string;
  title: string;
  slug: string;
  section: string;
  tierLabel: string | null;
  tagOptions: string[];
  detectedAccess: string[];
  landingOptions: PlacementOption[];
  homeIds: string[];
  placementCap: number;
  published: boolean;
  live: Proposal;
  initial: Proposal;
  requestStatus: string | null;
  rejectionNote: string | null;
}) {
  const router = useRouter();
  const [p, setP] = useState<Proposal>(initial);
  const [tab, setTab] = useState<TabKey>("details");
  const [newTag, setNewTag] = useState("");
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

  const photoCount = p.gallery.length + (p.heroImageUrl ? 1 : 0);
  const TABS: { key: TabKey; label: string }[] = [
    { key: "details", label: "Details" },
    { key: "photos", label: `Photos ${photoCount}` },
    { key: "hours", label: "Opening hours & prices" },
    { key: "access", label: "Access" },
    { key: "facilities", label: "Facilities" },
    { key: "where", label: `Where you appear ${p.placements.length || ""}`.trim() },
    { key: "contact", label: "Contact & booking" },
    { key: "address", label: "Address" },
    { key: "rooms", label: `Rooms ${p.rooms.length || ""}`.trim() },
    { key: "spaces", label: "Bookable spaces" },
  ];

  return (
    <div className="space-y-4">
      {requestStatus === "SUBMITTED" && (
        <div className="rounded-2xl border border-damson/30 bg-damson/5 p-4 text-sm">
          Your previous changes are already with the team for approval. If you save or send again, they will be replaced by this version.
        </div>
      )}
      {rejectionNote && (
        <div className="rounded-2xl border border-damson/30 bg-damson/5 p-4 text-sm">
          <p className="font-semibold text-damson">The team asked for another look:</p>
          <p className="mt-1">{rejectionNote}</p>
        </div>
      )}

      <div className="rounded-3xl border border-stone-200 bg-white">
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-stone-200 px-6 pt-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-semibold",
                tab === t.key ? "border-somerset-green text-somerset-green" : "border-transparent text-stone-500 hover:text-stone-900",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-5 p-6">
          {tab === "details" && (
            <>
              <Field label="Listing name" hint="Set by the Visit Somerset team.">
                <Input value={title} disabled readOnly />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Category">
                  <Input value={section} disabled readOnly />
                </Field>
                <Field label="Town">
                  <Input {...text("town")} />
                </Field>
              </div>
              {(live.startDate || p.startDate) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Starts">
                    <Input type="date" {...text("startDate")} />
                  </Field>
                  <Field label="Ends">
                    <Input type="date" {...text("endDate")} />
                  </Field>
                </div>
              )}
              <Field label="Tagline" hint="A few words, shown under the name.">
                <Input maxLength={300} {...text("tagline")} />
              </Field>
              <Field label="Short summary" hint="One or two sentences. Shown in search results and on cards.">
                <Textarea rows={3} maxLength={2000} {...text("subtitle")} />
              </Field>
              <Field label={`Description · ${p.bodyContent.length} characters`}>
                <Textarea rows={9} maxLength={20000} {...text("bodyContent")} />
              </Field>
            </>
          )}

          {tab === "photos" && (
            <>
              <Field label="Main photo">
                <MediaPickerField value={p.heroImageUrl} onChange={(u) => set("heroImageUrl", u)} />
              </Field>
              <Field label="Gallery" hint="Up to 24 photos. Upload them and they are added straight away.">
                <GalleryField urls={p.gallery} onChange={(u) => set("gallery", u)} />
              </Field>
            </>
          )}

          {tab === "hours" && (
            <>
              <Field label="Opening times">
                <Textarea rows={5} maxLength={4000} {...text("openingTimes")} />
              </Field>
              <Field label="Prices / admission">
                <Textarea rows={5} maxLength={4000} {...text("admission")} />
              </Field>
            </>
          )}

          {tab === "access" && (
            <>
              <div>
                <p className="text-sm font-semibold text-stone-700">Which of these do you offer?</p>
                <p className="text-xs text-stone-500">Tick only what is true. Visitors filter on these, and they count towards your health score.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {ACCESS_FEATURES.map((f) => {
                    const on = p.accessibility.includes(f.key);
                    const known = detectedAccess.includes(f.key) && !on;
                    return (
                      <label
                        key={f.key}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm",
                          on ? "border-somerset-green bg-somerset-green/5" : "border-stone-200",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            set("accessibility", on ? p.accessibility.filter((k) => k !== f.key) : [...p.accessibility, f.key])
                          }
                          className="mt-0.5 size-4 accent-[#3d685b]"
                        />
                        <span>
                          <strong className="text-stone-900">{f.label}</strong>
                          <span className="block text-xs text-stone-500">{f.help}</span>
                          {known && <span className="block text-xs font-semibold text-somerset-green">Already on your listing</span>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <Field label="Access and general information" hint="Step-free access, parking, dogs, anything a visitor should know before they come.">
                <Textarea rows={5} maxLength={2000} {...text("accessNotes")} />
              </Field>
              <Field label="Road directions">
                <Textarea rows={4} maxLength={2000} {...text("roadDirections")} />
              </Field>
              <Field label="Public transport">
                <Textarea rows={4} maxLength={2000} {...text("publicTransport")} />
              </Field>
            </>
          )}

          {tab === "facilities" && (
            <>
              <p className="text-sm text-stone-600">Tags shown on your card. Choose the ones that describe you, or add your own.</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...tagOptions, ...p.tags])).map((t) => {
                  const on = p.tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set("tags", on ? p.tags.filter((x) => x !== t) : [...p.tags, t].slice(0, 12))}
                      className={cn(
                        "rounded-full border px-4 py-1.5 text-sm font-semibold",
                        on ? "border-somerset-green bg-somerset-green text-white" : "border-stone-300 text-stone-700 hover:bg-stone-50",
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <form
                className="flex max-w-sm gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = newTag.trim().slice(0, 40);
                  if (v && !p.tags.includes(v)) set("tags", [...p.tags, v].slice(0, 12));
                  setNewTag("");
                }}
              >
                <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add your own tag" />
                <button type="submit" className="rounded-full border border-stone-300 px-4 text-sm font-semibold hover:bg-stone-50">
                  Add
                </button>
              </form>
            </>
          )}

          {tab === "where" && (
            <>
              <p className="text-sm text-stone-600">
                Choose other landing pages your listing should also appear on, such as Animals or Family fun. Your level allows up to{" "}
                <strong>{placementCap}</strong> extra landing page{placementCap === 1 ? "" : "s"}, in addition to where you already sit.
              </p>
              {placementCap === 0 ? (
                <p className="rounded-2xl bg-cool-grey p-4 text-sm text-stone-700">
                  Extra landing pages come with a membership level. Ask the team about upgrading.
                </p>
              ) : (
                <PlacementsPicker
                  options={landingOptions}
                  selected={p.placements}
                  onChange={(ids) => set("placements", ids)}
                  cap={placementCap}
                  homeIds={homeIds}
                />
              )}
            </>
          )}

          {tab === "spaces" && (
            <div className="space-y-3 text-sm text-stone-700">
              <p>
                Put this listing at the top of a Visit Somerset page for a week or more, with a Featured ribbon. Choose the pages and weeks
                on the Bookable spaces screen.
              </p>
              <Link href="/portal/spaces" className="inline-block rounded-full bg-somerset-green px-5 py-2.5 font-bold text-white hover:opacity-90">
                Book advertising space
              </Link>
            </div>
          )}

          {tab === "contact" && (
            <>
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
                <Field label="Booking link" hint="Where visitors go to book.">
                  <Input {...text("bookingUrl")} placeholder="https://" />
                </Field>
                <Field label="Booking button text">
                  <Input maxLength={40} {...text("bookingLabel")} placeholder="Book now" />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Facebook">
                  <Input {...text("facebook")} placeholder="https://" />
                </Field>
                <Field label="Instagram">
                  <Input {...text("instagram")} placeholder="https://" />
                </Field>
                <Field label="X / Twitter">
                  <Input {...text("twitter")} placeholder="https://" />
                </Field>
              </div>
            </>
          )}

          {tab === "address" && (
            <>
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
              <p className="text-xs text-stone-500">The map pin is set by the team. Ask them if it needs moving.</p>
            </>
          )}

          {tab === "rooms" && (
            <>
              <p className="text-sm text-stone-600">
                Accommodation only. Each room can have its own booking link; if left empty, your booking link is used.
              </p>
              {p.rooms.map((r, i) => (
                <div key={i} className="grid gap-3 rounded-2xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-stone-800">Room {i + 1}</p>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "rooms",
                          p.rooms.filter((_, idx) => idx !== i),
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-red-600"
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
              <button
                type="button"
                onClick={() => set("rooms", [...p.rooms, { ...EMPTY_ROOM }].slice(0, 30))}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold hover:bg-stone-50"
              >
                <Plus className="size-4" /> Add a room
              </button>
            </>
          )}
        </div>

        <div className="mx-6 mb-6 rounded-2xl bg-stone-100 p-4 text-sm text-stone-600">
          <strong className="text-stone-800">Two fields are locked.</strong> Your membership level
          {tierLabel ? ` (${tierLabel})` : ""} and the Featured placement are set by the Visit Somerset team.{" "}
          <Link href="/portal/membership" className="font-semibold text-somerset-green hover:underline">
            Ask about upgrading
          </Link>
          .
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-stone-200 px-6 py-4">
          <button
            type="button"
            disabled={pending || changedCount === 0}
            onClick={() => run(true)}
            className="rounded-full bg-damson px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
            title={`Send your changes to ${title} for approval`}
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
          {published && (
            <Link href={`/${slug}`} target="_blank" className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-semibold hover:bg-stone-50">
              Preview as visitor
            </Link>
          )}
          {requestStatus && (
            <button type="button" disabled={pending} onClick={discard} className="text-sm font-medium text-stone-500 hover:text-stone-900 hover:underline">
              Discard changes
            </button>
          )}
          <span className="ml-auto text-xs text-stone-500">
            {changedCount === 0 ? "No changes from the live page yet." : `${changedCount} section${changedCount === 1 ? "" : "s"} changed from the live page.`}
          </span>
        </div>
      </div>
    </div>
  );
}
