"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveMasterPageAction } from "@/app/cms/actions";
import { SUBMIT_EVENT_TOKEN, type MasterLink, type MasterSettings } from "@/lib/data/site-settings";

function LinkRows({
  rows,
  onChange,
  disabled,
  hrefLabel = "Link",
}: {
  rows: MasterLink[];
  onChange: (rows: MasterLink[]) => void;
  disabled: boolean;
  hrefLabel?: string;
}) {
  return (
    <div className="space-y-2">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2">
          <Input
            placeholder="Label"
            value={row.label}
            disabled={disabled}
            onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, label: e.target.value } : r)))}
          />
          <Input
            placeholder={hrefLabel}
            value={row.href === SUBMIT_EVENT_TOKEN ? "(automatic: Submit an event page)" : row.href}
            disabled={disabled || row.href === SUBMIT_EVENT_TOKEN}
            onChange={(e) => onChange(rows.map((r, idx) => (idx === i ? { ...r, href: e.target.value } : r)))}
          />
          <Button type="button" size="icon" variant="ghost" disabled={disabled} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onChange([...rows, { label: "", href: "" }])}>
        <Plus className="h-3.5 w-3.5" /> Add link
      </Button>
    </div>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border bg-white">
      <div className="border-b bg-neutral-100 px-4 py-2">
        <h3 className="text-sm font-semibold text-neutral-700">{title}</h3>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

// Kentico's "Master page" tab: the template that wraps every page. Here that
// is the site header, main menu and footer — edited once, applied everywhere.
export function MasterPageTab({ initial, readOnly }: { initial: MasterSettings; readOnly: boolean }) {
  const [s, setS] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();

  function update(patch: Partial<MasterSettings>) {
    setS((v) => ({ ...v, ...patch }));
    setDirty(true);
  }

  function save() {
    startTransition(async () => {
      try {
        const saved = await saveMasterPageAction(s);
        setS(saved);
        setDirty(false);
        toast.success("Master page saved — the header and footer are updated on the live site");
      } catch {
        toast.error("Could not save — check your permissions.");
      }
    });
  }

  useEffect(() => {
    const onSave = () => dirty && !readOnly && save();
    window.addEventListener("cms:save", onSave);
    return () => window.removeEventListener("cms:save", onSave);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, readOnly, s]);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="rounded-md border border-somerset-green/20 bg-somerset-green/5 p-4 text-sm text-neutral-700">
        <strong>Master page.</strong> The header, main menu and footer shown on <em>every</em> page of the site. Changes here are
        applied site-wide the moment you save — this is not specific to the page you have open.
      </div>

      <Panel title="Main menu" hint="The top navigation. Use the page's slug (see Properties › URLs). Menus open automatically from a page's child pages.">
        <div className="space-y-2">
          {s.mainNav.map((n, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Label"
                value={n.label}
                disabled={readOnly}
                onChange={(e) => update({ mainNav: s.mainNav.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)) })}
              />
              <Input
                placeholder="page slug, e.g. places-to-stay"
                value={n.slug}
                disabled={readOnly}
                onChange={(e) => update({ mainNav: s.mainNav.map((x, idx) => (idx === i ? { ...x, slug: e.target.value } : x)) })}
              />
              <Button type="button" size="icon" variant="ghost" disabled={readOnly} onClick={() => update({ mainNav: s.mainNav.filter((_, idx) => idx !== i) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          <Button type="button" size="sm" variant="outline" disabled={readOnly || s.mainNav.length >= 8} onClick={() => update({ mainNav: [...s.mainNav, { label: "", slug: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add menu item
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t pt-4">
          <div className="space-y-1.5">
            <Label>Map link label</Label>
            <Input value={s.mapLabel} disabled={readOnly} onChange={(e) => update({ mapLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Purple button label</Label>
            <Input value={s.bookButtonLabel} disabled={readOnly} onChange={(e) => update({ bookButtonLabel: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Purple button link</Label>
            <Input value={s.bookButtonHref} disabled={readOnly} onChange={(e) => update({ bookButtonHref: e.target.value })} />
          </div>
        </div>
      </Panel>

      <Panel title="Utility links" hint="The small green strip above the menu (Business, Bath, Taunton...). My Trip and Sign in are always shown.">
        <LinkRows rows={s.utilityLinks} onChange={(utilityLinks) => update({ utilityLinks })} disabled={readOnly} />
      </Panel>

      <Panel title="Newsletter band & footer text">
        <div className="space-y-1.5">
          <Label>Newsletter title</Label>
          <Input value={s.newsletterTitle} disabled={readOnly} onChange={(e) => update({ newsletterTitle: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Newsletter text</Label>
          <Textarea rows={2} value={s.newsletterText} disabled={readOnly} onChange={(e) => update({ newsletterText: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Footer tagline</Label>
          <Input value={s.footerTagline} disabled={readOnly} onChange={(e) => update({ footerTagline: e.target.value })} />
        </div>
      </Panel>

      <Panel title="Footer columns" hint="Up to five columns of links.">
        <div className="space-y-4">
          {s.footerColumns.map((col, ci) => (
            <div key={ci} className="space-y-2 rounded-md border p-3">
              <div className="flex gap-2">
                <Input
                  className="font-medium"
                  placeholder="Column heading"
                  value={col.heading}
                  disabled={readOnly}
                  onChange={(e) =>
                    update({ footerColumns: s.footerColumns.map((c, idx) => (idx === ci ? { ...c, heading: e.target.value } : c)) })
                  }
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  disabled={readOnly}
                  onClick={() => update({ footerColumns: s.footerColumns.filter((_, idx) => idx !== ci) })}
                  title="Remove column"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <LinkRows
                rows={col.links}
                disabled={readOnly}
                onChange={(links) => update({ footerColumns: s.footerColumns.map((c, idx) => (idx === ci ? { ...c, links } : c)) })}
              />
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={readOnly || s.footerColumns.length >= 5}
            onClick={() => update({ footerColumns: [...s.footerColumns, { heading: "", links: [] }] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add column
          </Button>
        </div>
      </Panel>

      <Panel title="Legal links" hint="The small links at the very bottom (Terms, Cookies...).">
        <LinkRows rows={s.legalLinks} onChange={(legalLinks) => update({ legalLinks })} disabled={readOnly} />
      </Panel>

      {!readOnly && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending || !dirty}>
            {pending ? "Saving..." : "Save master page"}
          </Button>
        </div>
      )}
    </div>
  );
}
