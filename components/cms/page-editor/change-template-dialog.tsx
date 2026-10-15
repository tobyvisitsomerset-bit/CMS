"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutTemplate } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { changePageTemplateAction, listTemplatesAction } from "@/app/cms/actions";

type T = { id: string; name: string; description: string | null };

// Properties > Template, as in Kentico: pick a different template for this
// page. Optionally do the same for the sections under it so a whole family
// (Hotels, B&Bs, Camping...) stays uniform. Reversible from Version history.
export function ChangeTemplateButton({ pageId, pageTitle }: { pageId: string; pageTitle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<T[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [sub, setSub] = useState(false);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    void listTemplatesAction().then((rows) => setTemplates(rows as T[]));
  }, [open]);

  function apply() {
    if (!chosen) return;
    start(async () => {
      try {
        const res = await changePageTemplateAction({ pageId, templateId: chosen, includeSubsections: sub });
        toast.success(res.changed.length > 1 ? `Template changed on ${res.changed.length} pages` : "Template changed");
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Could not change the template.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
      >
        <LayoutTemplate className="h-3.5 w-3.5" /> Change template
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change template for {pageTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            This replaces the page&apos;s widgets with the template&apos;s. Your text, photos and form details are not touched, and the
            old version can be restored from Version history.
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {templates.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                  chosen === t.id ? "border-somerset-green bg-somerset-green/5" : "border-neutral-200"
                }`}
              >
                <input type="radio" name="template" checked={chosen === t.id} onChange={() => setChosen(t.id)} className="mt-1" />
                <span>
                  <strong>{t.name}</strong>
                  {t.description && <span className="block text-xs text-neutral-500">{t.description}</span>}
                </span>
              </label>
            ))}
            {templates.length === 0 && <p className="text-sm text-neutral-400">Loading templates...</p>}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sub} onChange={(e) => setSub(e.target.checked)} />
            Also apply to the sections under this page that have no widgets yet
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!chosen || pending} onClick={apply}>
              {pending ? "Applying..." : "Use this template"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
