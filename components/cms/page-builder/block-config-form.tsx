"use client";

/* eslint-disable @typescript-eslint/no-explicit-any -- config is arbitrary per-block-type JSON, typed loosely by design */

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import type { BlockType } from "./block-types";

type Config = Record<string, any>;
type SetConfig = (updater: (c: Config) => Config) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => onChange(values.map((x, idx) => (idx === i ? e.target.value : x)))}
          />
          <Button type="button" size="icon" variant="ghost" onClick={() => onChange(values.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...values, ""])}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

export function BlockConfigForm({ type, config, setConfig }: { type: BlockType; config: Config; setConfig: SetConfig }) {
  const set = (patch: Config) => setConfig((c) => ({ ...c, ...patch }));

  switch (type) {
    case "hero":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Subheading">
            <Textarea rows={2} value={config.subheading ?? ""} onChange={(e) => set({ subheading: e.target.value })} />
          </Field>
          <Field label="Background image">
            <MediaPickerField value={config.imageUrl ?? ""} onChange={(url) => set({ imageUrl: url })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CTA label">
              <Input value={config.ctaLabel ?? ""} onChange={(e) => set({ ctaLabel: e.target.value })} />
            </Field>
            <Field label="CTA URL">
              <Input value={config.ctaUrl ?? ""} onChange={(e) => set({ ctaUrl: e.target.value })} />
            </Field>
          </div>
        </div>
      );

    case "text":
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Body">
            <Textarea rows={6} value={config.body ?? ""} onChange={(e) => set({ body: e.target.value })} />
          </Field>
        </div>
      );

    case "gallery":
      return (
        <Field label="Images">
          <div className="space-y-2">
            {(config.imageUrls ?? []).map((url: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <MediaPickerField
                  value={url}
                  onChange={(u) =>
                    set({ imageUrls: (config.imageUrls ?? []).map((x: string, idx: number) => (idx === i ? u : x)) })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => set({ imageUrls: (config.imageUrls ?? []).filter((_: string, idx: number) => idx !== i) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => set({ imageUrls: [...(config.imageUrls ?? []), ""] })}>
              <Plus className="h-3.5 w-3.5" /> Add image
            </Button>
          </div>
        </Field>
      );

    case "cards": {
      const items: any[] = config.items ?? [];
      const update = (i: number, patch: any) => set({ items: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) });
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Columns">
            <Select value={String(config.columns ?? 3)} onValueChange={(v) => set({ columns: Number(v) })}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-end">
                  <Button type="button" size="icon" variant="ghost" onClick={() => set({ items: items.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input placeholder="Title" value={item.title ?? ""} onChange={(e) => update(i, { title: e.target.value })} />
                <Textarea placeholder="Description" rows={2} value={item.description ?? ""} onChange={(e) => update(i, { description: e.target.value })} />
                <MediaPickerField value={item.imageUrl ?? ""} onChange={(url) => update(i, { imageUrl: url })} />
                <Input placeholder="Badge (optional, e.g. Featured Member)" value={item.badge ?? ""} onChange={(e) => update(i, { badge: e.target.value })} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set({ items: [...items, { title: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add card
          </Button>
        </div>
      );
    }

    case "video":
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Video URL">
            <Input placeholder="https://..." value={config.videoUrl ?? ""} onChange={(e) => set({ videoUrl: e.target.value })} />
          </Field>
        </div>
      );

    case "accordion":
    case "faq": {
      const items: any[] = config.items ?? [];
      const update = (i: number, patch: any) => set({ items: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) });
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-end">
                  <Button type="button" size="icon" variant="ghost" onClick={() => set({ items: items.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Input placeholder="Question" value={item.question ?? ""} onChange={(e) => update(i, { question: e.target.value })} />
                <Textarea placeholder="Answer" rows={2} value={item.answer ?? ""} onChange={(e) => update(i, { answer: e.target.value })} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set({ items: [...items, { question: "", answer: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add item
          </Button>
        </div>
      );
    }

    case "testimonials": {
      const items: any[] = config.items ?? [];
      const update = (i: number, patch: any) => set({ items: items.map((x, idx) => (idx === i ? { ...x, ...patch } : x)) });
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex justify-end">
                  <Button type="button" size="icon" variant="ghost" onClick={() => set({ items: items.filter((_, idx) => idx !== i) })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Textarea placeholder="Quote" rows={2} value={item.quote ?? ""} onChange={(e) => update(i, { quote: e.target.value })} />
                <Input placeholder="Author" value={item.author ?? ""} onChange={(e) => update(i, { author: e.target.value })} />
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="outline" onClick={() => set({ items: [...items, { quote: "", author: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add testimonial
          </Button>
        </div>
      );
    }

    case "cta_banner":
      return (
        <div className="space-y-4">
          <Field label="Heading">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Subtext">
            <Input value={config.subtext ?? ""} onChange={(e) => set({ subtext: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label">
              <Input value={config.buttonLabel ?? ""} onChange={(e) => set({ buttonLabel: e.target.value })} />
            </Field>
            <Field label="Button URL">
              <Input value={config.buttonUrl ?? ""} onChange={(e) => set({ buttonUrl: e.target.value })} />
            </Field>
          </div>
          <Field label="Style">
            <Select value={config.style ?? "dark"} onValueChange={(v) => set({ style: v })}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      );

    case "map":
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Location label">
            <Input value={config.locationLabel ?? ""} onChange={(e) => set({ locationLabel: e.target.value })} />
          </Field>
          <p className="text-xs text-neutral-400">A live map provider can be connected later — this renders a placeholder for now.</p>
        </div>
      );

    case "listing_search":
      return (
        <div className="space-y-4">
          <Field label="Title">
            <Input value={config.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Subtitle">
            <Input value={config.subtitle ?? ""} onChange={(e) => set({ subtitle: e.target.value })} />
          </Field>
          <div className="flex items-center gap-2">
            <Switch checked={config.showSearchBar ?? true} onCheckedChange={(v) => set({ showSearchBar: v })} />
            <Label>Show search box</Label>
          </div>
          <Field label="Filter pills">
            <StringListEditor
              values={config.filters ?? []}
              onChange={(v) => set({ filters: v })}
              placeholder="e.g. Dog friendly"
            />
          </Field>
        </div>
      );

    case "listing_grid":
      return (
        <div className="space-y-4">
          <Field label="Heading (optional)">
            <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
          </Field>
          <Field label="Listing category">
            <Select value={config.category ?? "ACCOMMODATION"} onValueChange={(v) => set({ category: v })}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCOMMODATION">Accommodation</SelectItem>
                <SelectItem value="FOOD_DRINK">Food &amp; Drink</SelectItem>
                <SelectItem value="ATTRACTION">Attractions</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-2">
            <Switch checked={config.showMap ?? true} onCheckedChange={(v) => set({ showMap: v })} />
            <Label>Show map alongside listings</Label>
          </div>
        </div>
      );

    case "event_calendar":
      return (
        <Field label="Heading (optional)">
          <Input value={config.heading ?? ""} onChange={(e) => set({ heading: e.target.value })} />
        </Field>
      );

    default:
      return <p className="text-sm text-neutral-400">No settings for this section type.</p>;
  }
}
