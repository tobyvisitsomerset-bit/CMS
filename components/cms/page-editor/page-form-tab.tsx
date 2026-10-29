"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockConfigForm } from "@/components/cms/page-builder/block-config-form";
import { MediaPickerField } from "@/components/cms/media-library/media-picker-field";
import { FocusPicker } from "@/components/cms/focus-picker";
import { ScriptText } from "@/components/site/script-text";
import { savePageFormAction } from "@/app/cms/actions";
import { pageDisplay } from "@/lib/page-display";
import { MENU_GROUPS, type MenuGroup } from "@/lib/menu-group";
import type { PageFormKind } from "@/lib/landing";

function parse(config: string | null): Record<string, unknown> {
  try {
    return JSON.parse(config || "{}");
  } catch {
    return {};
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 bg-[#e5e5e5] px-4 py-2 text-left text-[16px] font-semibold text-[#262524] hover:bg-[#dcdcd9]"
      >
        {open ? <Minus className="h-4 w-4 text-[#4a4947]" strokeWidth={3} /> : <Plus className="h-4 w-4 text-[#4a4947]" strokeWidth={3} />}
        {title}
      </button>
      {open && <div className="space-y-3 px-2 py-4">{children}</div>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
      <Label className="block text-[13px] font-semibold text-[#26688a] sm:pt-2 sm:text-right">{label}:</Label>
      <div className="max-w-2xl space-y-1">{children}</div>
    </div>
  );
}

/**
 * The Form tab for every page that is not a member listing: the home page,
 * section landing pages and ordinary pages (terms, contact, news...). It
 * follows Kentico 11's "Page (menu item)" form so the team's habits carry
 * over. Member listings keep the listing form.
 */
export function PageFormTab({
  page,
  kind,
  block,
  menu,
  canEditMenu,
  readOnly,
}: {
  page: {
    id: string;
    title: string;
    slug: string;
    subtitle: string | null;
    customFields: string | null;
    heroImageUrl: string | null;
    bodyContent: string | null;
    callToActionLabel: string | null;
    callToActionUrl: string | null;
  };
  kind: Exclude<PageFormKind, "listing">;
  block: { id: string; config: string | null } | null;
  menu: { group: MenuGroup; newTab: boolean };
  canEditMenu: boolean;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const display = pageDisplay(page);

  const [title, setTitle] = useState(page.title);
  const [titleMarkup, setTitleMarkup] = useState(display.titleMarkup === page.title ? "" : display.titleMarkup);
  const [slug, setSlug] = useState(page.slug);
  const [subtitle, setSubtitle] = useState(display.subtitle ?? "");
  const [subtitleScript, setSubtitleScript] = useState(display.subtitleScript);
  const [subtitleAbove, setSubtitleAbove] = useState(display.subtitleAbove);
  const [summary, setSummary] = useState(display.summary ?? "");
  const [menuGroup, setMenuGroup] = useState<MenuGroup>(menu.group);
  const [newWindow, setNewWindow] = useState(display.newWindow || menu.newTab);
  const [focus, setFocus] = useState(display.focus ?? "");
  const [heroImageUrl, setHeroImageUrl] = useState(page.heroImageUrl ?? "");
  const [body, setBody] = useState(page.bodyContent ?? "");
  const [ctaLabel, setCtaLabel] = useState(page.callToActionLabel ?? "");
  const [ctaUrl, setCtaUrl] = useState(page.callToActionUrl ?? "");
  const [config, setConfig] = useState<Record<string, unknown>>(() => parse(block?.config ?? null));

  useEffect(() => {
    const onSave = () =>
      start(async () => {
        try {
          await savePageFormAction(page.id, {
            title,
            slug,
            titleMarkup,
            subtitle,
            subtitleScript,
            subtitleAbove,
            summary,
            menuGroup,
            newWindow,
            focus,
            heroImageUrl: kind === "page" ? heroImageUrl || null : page.heroImageUrl,
            bodyContent: kind === "page" ? body : null,
            callToActionLabel: kind === "page" ? ctaLabel : null,
            callToActionUrl: kind === "page" ? ctaUrl : null,
            block: block ? { id: block.id, config } : null,
          });
          toast.success("Saved");
          router.refresh();
        } catch (e) {
          toast.error(e instanceof Error && e.message ? e.message : "Could not save - check your permissions.");
        }
      });
    window.addEventListener("cms:save", onSave);
    return () => window.removeEventListener("cms:save", onSave);
  }, [page.id, page.heroImageUrl, kind, block, title, slug, titleMarkup, subtitle, subtitleScript, subtitleAbove, summary, menuGroup, newWindow, focus, heroImageUrl, body, ctaLabel, ctaUrl, config, router]);

  const isHome = kind === "home";
  const shownTitle = titleMarkup.trim() || title;
  const selectCls = "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6">
      <fieldset disabled={readOnly || pending} className="space-y-4 disabled:opacity-60">
        <Section title="General">
          <Field label="Page name *">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Title">
            <Textarea rows={2} value={titleMarkup} onChange={(e) => setTitleMarkup(e.target.value)} />
            <p className="text-xs text-neutral-500">Leave blank to use the page name. Put *asterisks* round words to use the script font, for example: Places to *stay*.</p>
            {titleMarkup.trim() && (
              <p className="rounded bg-neutral-50 px-3 py-2 font-serif text-xl font-black text-stone-900">
                <ScriptText text={shownTitle} className="text-[1.15em]" />
              </p>
            )}
          </Field>
          <Field label="Subtitle">
            <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
          </Field>
          <Field label="Subtitle in script font?">
            <input type="checkbox" checked={subtitleScript} onChange={(e) => setSubtitleScript(e.target.checked)} />
          </Field>
          <Field label="Display subtitle above title?">
            <input type="checkbox" checked={subtitleAbove} onChange={(e) => setSubtitleAbove(e.target.checked)} />
          </Field>
          <Field label="Summary">
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
            <p className="text-xs text-neutral-500">A short description, used in search results and when the page is shared.</p>
          </Field>
          {!isHome && (
            <Field label="Slug">
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
            </Field>
          )}
          <Field label="Menu group">
            <select className={selectCls} value={menuGroup} disabled={!canEditMenu} onChange={(e) => setMenuGroup(e.target.value as MenuGroup)}>
              {MENU_GROUPS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              {canEditMenu
                ? "Adds this page to that menu on the website. The order of the links is set on the Master page tab."
                : "Only people who can publish can change the menus."}
            </p>
          </Field>
          <Field label="Open link in new tab?">
            <input type="checkbox" checked={newWindow} onChange={(e) => setNewWindow(e.target.checked)} />
          </Field>
        </Section>

        {kind === "page" && (
          <Section title="Image">
            <Field label="Image">
              <MediaPickerField value={heroImageUrl} onChange={setHeroImageUrl} disabled={readOnly} />
            </Field>
            <Field label="Focus point">
              <FocusPicker imageUrl={heroImageUrl} value={focus} onChange={setFocus} disabled={readOnly} />
            </Field>
          </Section>
        )}

        {isHome && (
          <Section title="Top of the page (image, rotating photos, heading)">
            <BlockConfigForm type="hero" config={config} setConfig={(updater) => setConfig((c) => updater(c))} />
          </Section>
        )}

        {kind === "explorer" && (
          <Section title="Landing page settings">
            <BlockConfigForm type="listing_explorer" config={config} setConfig={(updater) => setConfig((c) => updater(c))} />
          </Section>
        )}

        {kind === "page" && (
          <>
            <Section title="Page text">
              <Field label="Text">
                <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
                <p className="text-xs text-neutral-500">Leave a blank line between paragraphs.</p>
              </Field>
            </Section>
            <Section title="Button">
              <Field label="Button label">
                <Input placeholder="e.g. Contact us" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
              </Field>
              <Field label="Button URL">
                <Input placeholder="https://..." value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
              </Field>
            </Section>
          </>
        )}
      </fieldset>
    </div>
  );
}
