"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronDown, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { MediaPickerDialog } from "@/components/cms/media-library/media-picker-dialog";
import { saveContentAction } from "@/app/cms/actions";
import { type CustomField, getCF, parseCustomFieldsArray, serializeCustomFields, setCF } from "@/lib/custom-fields";
import type { getPageById } from "@/lib/data/pages";
import type { MembershipTier } from "@prisma/client";

const MEMBERSHIP_TIERS: { value: MembershipTier; label: string }[] = [
  { value: "PLATINUM", label: "Platinum" },
  { value: "GOLD", label: "Gold" },
  { value: "SILVER", label: "Silver" },
  { value: "BRONZE", label: "Bronze" },
];

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  tagline: z.string().optional(),
  summary: z.string().optional(),
  bodyContent: z.string().optional(),
  callToActionLabel: z.string().optional(),
  callToActionUrl: z.string().optional(),
  tags: z.string().optional(),
  categories: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// Today's date as a yyyy-mm-dd string, for the "Today"/"Now" quick-set
// buttons and for seeding <input type="date"> values.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateToIso(d: Date | null | undefined): string {
  return d ? new Date(d).toISOString().slice(0, 10) : "";
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-neutral-100 px-4 py-2 text-left text-sm font-semibold text-neutral-700 hover:bg-neutral-200"
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="grid grid-cols-2 gap-4 p-4">{children}</div>}
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${full ? "col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function FormTab({ page, readOnly }: { page: PageDetail; readOnly: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cf, setCfState] = useState<CustomField[]>(() => parseCustomFieldsArray(page.customFields));
  const [gallery, setGallery] = useState<string[]>(() => (page.galleryUrls ? JSON.parse(page.galleryUrls) : []));
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState(page.heroImageUrl ?? "");
  const [membershipTier, setMembershipTier] = useState<MembershipTier | null>(page.membershipTier);
  const [publishDate, setPublishDate] = useState(dateToIso(page.publishDate));
  const [expiryDate, setExpiryDate] = useState(dateToIso(page.expiryDate));
  const [dirty, setDirty] = useState(false);

  function set(key: string, value: string) {
    setCfState((f) => setCF(f, key, value));
    setDirty(true);
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: page.title,
      slug: page.slug,
      tagline: page.tagline ?? "",
      summary: page.subtitle ?? "",
      bodyContent: page.bodyContent ?? "",
      callToActionLabel: page.callToActionLabel ?? "",
      callToActionUrl: page.callToActionUrl ?? "",
      tags: page.tags.map((t) => t.name).join(", "),
      categories: page.categories.map((c) => c.name).join(", "),
    },
  });

  function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        await saveContentAction(
          page.id,
          {
            title: values.title,
            slug: values.slug,
            tagline: values.tagline || null,
            subtitle: values.summary || null,
            heroImageUrl: heroImageUrl || null,
            galleryUrls: gallery.length ? JSON.stringify(gallery) : null,
            bodyContent: values.bodyContent || null,
            callToActionLabel: values.callToActionLabel || null,
            callToActionUrl: values.callToActionUrl || null,
            membershipTier,
            publishDate: publishDate ? new Date(publishDate) : null,
            expiryDate: expiryDate ? new Date(expiryDate) : null,
            customFields: serializeCustomFields(cf),
          },
          {
            tags: (values.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean),
            categories: (values.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          },
        );
        toast.success("Saved");
        setDirty(false);
        router.refresh();
      } catch {
        toast.error("Could not save — check your permissions.");
      }
    });
  }

  const canSave = !readOnly && (isDirty || dirty);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-4xl p-6">
      <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-60">
        <div className="sticky top-0 z-10 -mx-6 flex items-center gap-2 border-b bg-white px-6 py-3">
          <Button type="submit" disabled={pending || !canSave}>
            {pending ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="outline" disabled>
            Spell check
          </Button>
        </div>

        <Section title="General">
          <Field label="Membership">
            <Select
              value={membershipTier ?? "NONE"}
              onValueChange={(v) => {
                setMembershipTier(v === "NONE" ? null : (v as MembershipTier));
                setDirty(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Not a member business</SelectItem>
                {MEMBERSHIP_TIERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Slug">
            <Input {...register("slug")} />
            {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
          </Field>
        </Section>

        <Section title="Main Details">
          <Field label="Image">
            <MediaPickerField value={getCF(cf, "ItemImage")} onChange={(v) => set("ItemImage", v)} disabled={readOnly} />
          </Field>
          <Field label="Hero image">
            <MediaPickerField value={heroImageUrl} onChange={setHeroImageUrl} disabled={readOnly} />
          </Field>
          <Field label="Title" full>
            <Input {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </Field>
          <Field label="Tagline">
            <Input placeholder="e.g. Somerset's finest cyder press" {...register("tagline")} />
          </Field>
          <Field label="Subtitle">
            <Input value={getCF(cf, "ItemSubtitle")} onChange={(e) => set("ItemSubtitle", e.target.value)} />
          </Field>
          <Field label="Summary" full>
            <Textarea rows={3} {...register("summary")} />
          </Field>
          <Field label="Card Summary" full>
            <Textarea
              rows={2}
              value={getCF(cf, "ItemCardSummary")}
              onChange={(e) => set("ItemCardSummary", e.target.value)}
            />
          </Field>
          <Field label="Description" full>
            <Textarea rows={8} {...register("bodyContent")} />
          </Field>
          <Field label="Video Link">
            <Input value={getCF(cf, "ItemVideoLink")} onChange={(e) => set("ItemVideoLink", e.target.value)} />
          </Field>
          <Field label="Video preview image">
            <MediaPickerField
              value={getCF(cf, "ItemVideoPreviewImage")}
              onChange={(v) => set("ItemVideoPreviewImage", v)}
              disabled={readOnly}
            />
          </Field>
          <div className="col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Gallery</Label>
              {!readOnly && (
                <Button type="button" size="sm" variant="outline" onClick={() => setGalleryPickerOpen(true)}>
                  <Plus className="h-3.5 w-3.5" /> Add image
                </Button>
              )}
            </div>
            {gallery.length === 0 ? (
              <p className="text-xs text-neutral-400">No gallery images yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gallery.map((url, i) => (
                  <div key={url + i} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-24 rounded-md border object-cover" />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          setGallery((g) => g.filter((_, idx) => idx !== i));
                          setDirty(true);
                        }}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-neutral-500 shadow ring-1 ring-neutral-200 hover:text-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <MediaPickerDialog
              open={galleryPickerOpen}
              onOpenChange={setGalleryPickerOpen}
              onSelect={(url) => {
                setGallery((g) => [...g, url]);
                setDirty(true);
              }}
            />
          </div>
        </Section>

        <Section title="Address" defaultOpen={false}>
          <Field label="Address 1">
            <Input value={getCF(cf, "ItemAddress1")} onChange={(e) => set("ItemAddress1", e.target.value)} />
          </Field>
          <Field label="Address 2">
            <Input value={getCF(cf, "ItemAddress2")} onChange={(e) => set("ItemAddress2", e.target.value)} />
          </Field>
          <Field label="Address 3">
            <Input value={getCF(cf, "ItemAddress3")} onChange={(e) => set("ItemAddress3", e.target.value)} />
          </Field>
          <Field label="Address 4">
            <Input value={getCF(cf, "ItemAddress4")} onChange={(e) => set("ItemAddress4", e.target.value)} />
          </Field>
          <Field label="Town">
            <Input value={getCF(cf, "ItemTown")} onChange={(e) => set("ItemTown", e.target.value)} />
          </Field>
          <Field label="County">
            <Input value={getCF(cf, "ItemCounty")} onChange={(e) => set("ItemCounty", e.target.value)} />
          </Field>
          <Field label="Country">
            <Input value={getCF(cf, "ItemCountry")} onChange={(e) => set("ItemCountry", e.target.value)} />
          </Field>
          <Field label="Postcode">
            <Input value={getCF(cf, "ItemPostcode")} onChange={(e) => set("ItemPostcode", e.target.value)} />
          </Field>
        </Section>

        <Section title="Contact" defaultOpen={false}>
          <Field label="Phone">
            <Input value={getCF(cf, "ItemPhone")} onChange={(e) => set("ItemPhone", e.target.value)} />
          </Field>
          <Field label="Fax">
            <Input value={getCF(cf, "ItemFax")} onChange={(e) => set("ItemFax", e.target.value)} />
          </Field>
          <Field label="Email">
            <Input value={getCF(cf, "ItemEmail")} onChange={(e) => set("ItemEmail", e.target.value)} />
          </Field>
          <Field label="Web">
            <Input value={getCF(cf, "ItemWeb")} onChange={(e) => set("ItemWeb", e.target.value)} />
          </Field>
          <Field label="Booking Web">
            <Input value={getCF(cf, "ItemBookingWeb")} onChange={(e) => set("ItemBookingWeb", e.target.value)} />
          </Field>
          <Field label="Booking Web Button Text">
            <Input
              value={getCF(cf, "ItemBookingWebButtonText")}
              onChange={(e) => set("ItemBookingWebButtonText", e.target.value)}
            />
          </Field>
          <Field label="Facebook">
            <Input value={getCF(cf, "ItemFacebook")} onChange={(e) => set("ItemFacebook", e.target.value)} />
          </Field>
          <Field label="Twitter">
            <Input value={getCF(cf, "ItemTwitter")} onChange={(e) => set("ItemTwitter", e.target.value)} />
          </Field>
          <Field label="Instagram">
            <Input value={getCF(cf, "ItemInstagram")} onChange={(e) => set("ItemInstagram", e.target.value)} />
          </Field>
        </Section>

        <Section title="Additional Info" defaultOpen={false}>
          <Field label="Member Name">
            <Input value={getCF(cf, "ItemMemberName")} onChange={(e) => set("ItemMemberName", e.target.value)} />
          </Field>
          <Field label="Star Rating">
            <Select
              value={getCF(cf, "ItemStarRating") || "n/a"}
              onValueChange={(v) => v && set("ItemStarRating", v === "n/a" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["n/a", "1", "2", "3", "4", "5"].map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Opening Times" full>
            <Textarea rows={2} value={getCF(cf, "ItemOpeningTimes")} onChange={(e) => set("ItemOpeningTimes", e.target.value)} />
          </Field>
          <Field label="Admission" full>
            <Textarea rows={2} value={getCF(cf, "ItemAdmission")} onChange={(e) => set("ItemAdmission", e.target.value)} />
          </Field>
          <Field label="Road Directions" full>
            <Textarea rows={2} value={getCF(cf, "ItemRoadDirections")} onChange={(e) => set("ItemRoadDirections", e.target.value)} />
          </Field>
          <Field label="Public Transport Directions" full>
            <Textarea
              rows={2}
              value={getCF(cf, "ItemPublicTransportDirections")}
              onChange={(e) => set("ItemPublicTransportDirections", e.target.value)}
            />
          </Field>
          <Field label="General Opening Information" full>
            <Textarea
              rows={2}
              value={getCF(cf, "ItemGeneralOpeningInformation")}
              onChange={(e) => set("ItemGeneralOpeningInformation", e.target.value)}
            />
          </Field>
          <Field label="Grading">
            <Input value={getCF(cf, "ItemGrading")} onChange={(e) => set("ItemGrading", e.target.value)} />
          </Field>
          <Field label="Award">
            <Input value={getCF(cf, "ItemAward")} onChange={(e) => set("ItemAward", e.target.value)} />
          </Field>
        </Section>

        <Section title="Event Specific" defaultOpen={false}>
          <Field label="Start Date">
            <div className="flex gap-2">
              <Input type="date" value={getCF(cf, "ItemStartDate")} onChange={(e) => set("ItemStartDate", e.target.value)} />
              {!readOnly && (
                <Button type="button" size="sm" variant="ghost" onClick={() => set("ItemStartDate", todayIso())}>
                  Today
                </Button>
              )}
            </div>
          </Field>
          <Field label="End Date">
            <div className="flex gap-2">
              <Input type="date" value={getCF(cf, "ItemEndDate")} onChange={(e) => set("ItemEndDate", e.target.value)} />
              {!readOnly && (
                <Button type="button" size="sm" variant="ghost" onClick={() => set("ItemEndDate", todayIso())}>
                  Today
                </Button>
              )}
            </div>
          </Field>
        </Section>

        <Section title="Widgets" defaultOpen={false}>
          <Field label="Trip Advisor" full>
            <Textarea
              rows={2}
              placeholder="Generate at tripadvisor.co.uk/Widgets"
              value={getCF(cf, "ItemWidgetTripAdvisor")}
              onChange={(e) => set("ItemWidgetTripAdvisor", e.target.value)}
            />
          </Field>
          <Field label="Facebook widget" full>
            <Textarea
              rows={2}
              placeholder="Generate at developers.facebook.com/docs/plugins/page-plugin"
              value={getCF(cf, "ItemWidgetFacebook")}
              onChange={(e) => set("ItemWidgetFacebook", e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <Checkbox
                checked={getCF(cf, "ItemWidgetFacebookAuto") === "true"}
                onCheckedChange={(c) => set("ItemWidgetFacebookAuto", c ? "true" : "false")}
              />
              Generate automatically from Facebook address above
            </label>
          </Field>
          <Field label="Twitter widget" full>
            <Textarea
              rows={2}
              placeholder="Generate at publish.twitter.com"
              value={getCF(cf, "ItemWidgetTwitter")}
              onChange={(e) => set("ItemWidgetTwitter", e.target.value)}
            />
            <label className="flex items-center gap-2 text-xs text-neutral-500">
              <Checkbox
                checked={getCF(cf, "ItemWidgetTwitterAuto") === "true"}
                onCheckedChange={(c) => set("ItemWidgetTwitterAuto", c ? "true" : "false")}
              />
              Generate automatically from Twitter address above
            </label>
          </Field>
        </Section>

        <Section title="Map" defaultOpen={false}>
          <Field label="Latitude">
            <Input value={getCF(cf, "ItemMapLatitude")} onChange={(e) => set("ItemMapLatitude", e.target.value)} />
          </Field>
          <Field label="Longitude">
            <Input value={getCF(cf, "ItemMapLongitude")} onChange={(e) => set("ItemMapLongitude", e.target.value)} />
          </Field>
        </Section>

        <Section title="Facilities" defaultOpen={false}>
          <p className="col-span-2 text-sm text-neutral-400">
            Not yet connected to the facility taxonomy used by listings — coming soon.
          </p>
        </Section>

        <Section title="Beyonk" defaultOpen={false}>
          <Field label="Embed code (full width)" full>
            <Textarea rows={2} value={getCF(cf, "ItemBeyonkFullWidth")} onChange={(e) => set("ItemBeyonkFullWidth", e.target.value)} />
          </Field>
          <Field label="Embed code (right column)" full>
            <Textarea
              rows={2}
              value={getCF(cf, "ItemBeyonkRightColumn")}
              onChange={(e) => set("ItemBeyonkRightColumn", e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Staylists" defaultOpen={false}>
          <div className="col-span-2 flex items-center gap-2">
            <Checkbox
              checked={getCF(cf, "ItemRemoveStaylist") === "true"}
              onCheckedChange={(c) => set("ItemRemoveStaylist", c ? "true" : "false")}
            />
            <Label className="font-normal">Remove Staylist?</Label>
          </div>
          <Field label="Staylists reference">
            <Input value={getCF(cf, "ItemStaylistsReference")} onChange={(e) => set("ItemStaylistsReference", e.target.value)} />
          </Field>
          <Field label="Staylists ID">
            <Input value={getCF(cf, "ItemStaylistsId")} onChange={(e) => set("ItemStaylistsId", e.target.value)} />
          </Field>
        </Section>

        <Section title="eCommerce" defaultOpen={false}>
          <p className="col-span-2 text-sm text-neutral-400">Reserved for future Shopify / WooCommerce integration.</p>
        </Section>

        <Section title="Availability" defaultOpen={false}>
          <Field label="User">
            <Input value={getCF(cf, "ItemAvailabilityUser")} onChange={(e) => set("ItemAvailabilityUser", e.target.value)} />
          </Field>
          <Field label="TXGB Shortname">
            <Input value={getCF(cf, "ItemTxgbShortname")} onChange={(e) => set("ItemTxgbShortname", e.target.value)} />
            <p className="text-xs text-neutral-400">Used for TXGB availability search</p>
          </Field>
        </Section>

        <Section title="Call To Action" defaultOpen={false}>
          <Field label="Button label">
            <Input placeholder="e.g. Book now" {...register("callToActionLabel")} />
          </Field>
          <Field label="Button URL">
            <Input placeholder="https://..." {...register("callToActionUrl")} />
          </Field>
        </Section>

        <Section title="Organization" defaultOpen={false}>
          <Field label="Tags">
            <Input placeholder="family-friendly, dog-friendly" {...register("tags")} />
          </Field>
          <Field label="Categories">
            <Input placeholder="Attractions, Outdoors" {...register("categories")} />
          </Field>
        </Section>

        <Section title="Publishing" defaultOpen={false}>
          <Field label="Publish from">
            <div className="flex gap-2">
              <Input type="date" value={publishDate} onChange={(e) => { setPublishDate(e.target.value); setDirty(true); }} />
              {!readOnly && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setPublishDate(todayIso()); setDirty(true); }}>
                  Now
                </Button>
              )}
            </div>
          </Field>
          <Field label="Publish to">
            <div className="flex gap-2">
              <Input type="date" value={expiryDate} onChange={(e) => { setExpiryDate(e.target.value); setDirty(true); }} />
              {!readOnly && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setExpiryDate(todayIso()); setDirty(true); }}>
                  Now
                </Button>
              )}
            </div>
          </Field>
        </Section>
      </fieldset>
    </form>
  );
}
