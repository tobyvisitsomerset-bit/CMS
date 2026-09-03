"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { MediaPickerDialog } from "@/components/cms/media-library/media-picker-dialog";
import { saveContentAction } from "@/app/cms/actions";
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
  subtitle: z.string().optional(),
  slug: z.string().min(1, "Slug is required"),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  heroImageUrl: z.string().optional(),
  tagline: z.string().optional(),
  bodyContent: z.string().optional(),
  callToActionLabel: z.string().optional(),
  callToActionUrl: z.string().optional(),
  tags: z.string().optional(),
  categories: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
type CustomField = { key: string; value: string };

function parseCustomFields(json: string | null): CustomField[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

export function ContentTab({ page, readOnly }: { page: PageDetail; readOnly: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customFields, setCustomFields] = useState<CustomField[]>(() => parseCustomFields(page.customFields));
  const [gallery, setGallery] = useState<string[]>(() => (page.galleryUrls ? JSON.parse(page.galleryUrls) : []));
  const [galleryPickerOpen, setGalleryPickerOpen] = useState(false);
  const [membershipTier, setMembershipTier] = useState<MembershipTier | null>(page.membershipTier);
  const [extraDirty, setExtraDirty] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: page.title,
      subtitle: page.subtitle ?? "",
      slug: page.slug,
      seoTitle: page.seoTitle ?? "",
      seoDescription: page.seoDescription ?? "",
      heroImageUrl: page.heroImageUrl ?? "",
      tagline: page.tagline ?? "",
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
            subtitle: values.subtitle || null,
            slug: values.slug,
            seoTitle: values.seoTitle || null,
            seoDescription: values.seoDescription || null,
            heroImageUrl: values.heroImageUrl || null,
            tagline: values.tagline || null,
            membershipTier,
            galleryUrls: gallery.length ? JSON.stringify(gallery) : null,
            bodyContent: values.bodyContent || null,
            callToActionLabel: values.callToActionLabel || null,
            callToActionUrl: values.callToActionUrl || null,
            customFields: customFields.length ? JSON.stringify(customFields.filter((f) => f.key)) : null,
          },
          {
            tags: (values.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean),
            categories: (values.categories ?? "").split(",").map((s) => s.trim()).filter(Boolean),
          },
        );
        toast.success("Saved");
        setExtraDirty(false);
        router.refresh();
      } catch {
        toast.error("Could not save — check your permissions.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-6 p-6">
      <fieldset disabled={readOnly} className="space-y-6 disabled:opacity-60">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label htmlFor="subtitle">Subtitle</Label>
            <Input id="subtitle" {...register("subtitle")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register("slug")} />
            {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Hero image</Label>
            <Controller
              name="heroImageUrl"
              control={control}
              render={({ field }) => (
                <MediaPickerField value={field.value ?? ""} onChange={field.onChange} disabled={readOnly} />
              )}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label>Membership tier</Label>
            <Select
              value={membershipTier ?? "NONE"}
              onValueChange={(v) => {
                setMembershipTier(v === "NONE" ? null : (v as MembershipTier));
                setExtraDirty(true);
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
            <p className="text-xs text-neutral-400">Higher tiers are shown first and get a badge in listings.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tagline">Tagline</Label>
            <Input id="tagline" placeholder="e.g. Somerset's finest cyder press" {...register("tagline")} />
          </div>
        </div>

        <div className="space-y-1.5">
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
                        setExtraDirty(true);
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
              setExtraDirty(true);
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bodyContent">Body content</Label>
          <Textarea id="bodyContent" rows={8} {...register("bodyContent")} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="callToActionLabel">Call to action label</Label>
            <Input id="callToActionLabel" placeholder="e.g. Book now" {...register("callToActionLabel")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="callToActionUrl">Call to action URL</Label>
            <Input id="callToActionUrl" placeholder="https://..." {...register("callToActionUrl")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="seoTitle">SEO title</Label>
            <Input id="seoTitle" {...register("seoTitle")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="seoDescription">SEO description</Label>
            <Input id="seoDescription" {...register("seoDescription")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input id="tags" placeholder="family-friendly, dog-friendly" {...register("tags")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="categories">Categories (comma separated)</Label>
            <Input id="categories" placeholder="Attractions, Outdoors" {...register("categories")} />
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label>Custom fields</Label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setCustomFields((f) => [...f, { key: "", value: "" }]);
                setExtraDirty(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add field
            </Button>
          </div>
          {customFields.map((field, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Field name"
                value={field.key}
                onChange={(e) => {
                  setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, key: e.target.value } : x)));
                  setExtraDirty(true);
                }}
              />
              <Input
                placeholder="Value"
                value={field.value}
                onChange={(e) => {
                  setCustomFields((f) => f.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)));
                  setExtraDirty(true);
                }}
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setCustomFields((f) => f.filter((_, idx) => idx !== i));
                  setExtraDirty(true);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button type="submit" disabled={pending || (!isDirty && !extraDirty)}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
