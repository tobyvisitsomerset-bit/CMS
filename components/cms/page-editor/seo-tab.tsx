"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { saveSeoAction } from "@/app/cms/actions";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

export function SeoTab({ page, readOnly }: { page: PageDetail; readOnly: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [values, setValues] = useState({
    seoTitle: page.seoTitle ?? "",
    seoDescription: page.seoDescription ?? "",
    seoKeywords: page.seoKeywords ?? "",
    canonicalUrl: page.canonicalUrl ?? "",
    ogTitle: page.ogTitle ?? "",
    ogDescription: page.ogDescription ?? "",
    socialShareImage: page.socialShareImage ?? "",
    schemaMarkup: page.schemaMarkup ?? "",
  });

  function set(patch: Partial<typeof values>) {
    setValues((v) => ({ ...v, ...patch }));
    setDirty(true);
  }

  function handleSave() {
    if (values.schemaMarkup.trim()) {
      try {
        JSON.parse(values.schemaMarkup);
        setSchemaError(null);
      } catch {
        setSchemaError("Schema markup must be valid JSON (JSON-LD).");
        return;
      }
    } else {
      setSchemaError(null);
    }

    startTransition(async () => {
      try {
        await saveSeoAction(page.id, {
          seoTitle: values.seoTitle || null,
          seoDescription: values.seoDescription || null,
          seoKeywords: values.seoKeywords || null,
          canonicalUrl: values.canonicalUrl || null,
          ogTitle: values.ogTitle || null,
          ogDescription: values.ogDescription || null,
          socialShareImage: values.socialShareImage || null,
          schemaMarkup: values.schemaMarkup || null,
        });
        toast.success("SEO settings saved");
        setDirty(false);
        router.refresh();
      } catch {
        toast.error("Could not save — check your permissions.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <fieldset disabled={readOnly} className="space-y-6 disabled:opacity-60">
        <div className="space-y-1.5">
          <Label>Meta title</Label>
          <Input value={values.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Meta description</Label>
          <Textarea rows={3} value={values.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Keywords (comma separated)</Label>
          <Input value={values.seoKeywords} onChange={(e) => set({ seoKeywords: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Canonical URL</Label>
          <Input placeholder="https://visitsomerset.co.uk/..." value={values.canonicalUrl} onChange={(e) => set({ canonicalUrl: e.target.value })} />
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div className="space-y-1.5">
            <Label>Open Graph title</Label>
            <Input value={values.ogTitle} onChange={(e) => set({ ogTitle: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Open Graph description</Label>
            <Input value={values.ogDescription} onChange={(e) => set({ ogDescription: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5 border-t pt-4">
          <Label>Social share image</Label>
          <MediaPickerField value={values.socialShareImage} onChange={(url) => set({ socialShareImage: url })} disabled={readOnly} />
        </div>

        <div className="space-y-1.5 border-t pt-4">
          <Label>Schema markup (JSON-LD)</Label>
          <Textarea
            rows={6}
            className="font-mono text-xs"
            placeholder='{"@context": "https://schema.org", "@type": "TouristAttraction", ...}'
            value={values.schemaMarkup}
            onChange={(e) => set({ schemaMarkup: e.target.value })}
          />
          {schemaError && <p className="text-xs text-red-600">{schemaError}</p>}
        </div>
      </fieldset>

      {!readOnly && (
        <div className="flex justify-end border-t pt-4">
          <Button onClick={handleSave} disabled={pending || !dirty}>
            {pending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}
