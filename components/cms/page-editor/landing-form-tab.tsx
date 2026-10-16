"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BlockConfigForm } from "@/components/cms/page-builder/block-config-form";
import type { LandingKind } from "@/lib/landing";

function parse(config: string | null): Record<string, unknown> {
  try {
    return JSON.parse(config || "{}");
  } catch {
    return {};
  }
}
import { saveContentAction, updateContentBlockAction } from "@/app/cms/actions";

type Block = { id: string; type: string; config: string | null };

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px] font-semibold text-[#26688a]">{label}</Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

export function LandingFormTab({
  page,
  landing,
  readOnly,
}: {
  page: { id: string; title: string; slug: string; subtitle: string | null };
  landing: { kind: LandingKind; block: Block };
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [subtitle, setSubtitle] = useState(page.subtitle ?? "");
  const [config, setConfig] = useState<Record<string, unknown>>(() => parse(landing.block.config));

  // The toolbar's Save button triggers this, as on the listing form.
  useEffect(() => {
    const onSave = () =>
      start(async () => {
        try {
          await saveContentAction(page.id, { title, slug, subtitle: subtitle || null });
          await updateContentBlockAction(landing.block.id, config);
          toast.success("Saved");
          router.refresh();
        } catch {
          toast.error("Could not save - check your permissions.");
        }
      });
    window.addEventListener("cms:save", onSave);
    return () => window.removeEventListener("cms:save", onSave);
  }, [page.id, landing.block.id, title, slug, subtitle, config, router]);

  const isHome = landing.kind === "home";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <p className="rounded-md bg-neutral-50 p-3 text-sm text-neutral-600">
        {isHome
          ? "This is the home page. Everything you see at the top of it is edited here, including the rotating photos."
          : "This is a landing page, so it only has the settings below. The list of businesses fills itself from what sits under this page."}
      </p>

      <fieldset disabled={readOnly || pending} className="space-y-5 disabled:opacity-60">
        <Row label="Page name">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Row>
        <Row label="Subtitle" hint="A short line describing the page. Used in search results and where the page is linked to.">
          <Textarea rows={2} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </Row>
        {!isHome && (
          <Row label="Web address (slug)">
            <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
          </Row>
        )}

        <div className="space-y-3 border-t pt-5">
          <h2 className="text-base font-semibold">{isHome ? "Top of the page" : "Landing page settings"}</h2>
          <BlockConfigForm type={isHome ? "hero" : "listing_explorer"} config={config} setConfig={(updater) => setConfig((c) => updater(c))} />
        </div>
      </fieldset>
    </div>
  );
}
