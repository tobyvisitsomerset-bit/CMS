"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Folder, LayoutTemplate } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createPageAction, listTemplatesAction } from "@/app/cms/actions";

type Template = { id: string; name: string; description: string | null };

export function CreatePageDialog({
  open,
  onOpenChange,
  parentId,
  isSection: isSectionProp,
  onLinkExisting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  isSection: boolean;
  onLinkExisting?: () => void;
}) {
  // Kentico asks what kind of page first: a page, or a folder to group pages.
  const [picked, setPicked] = useState<"page" | "section" | null>(null);
  const isSection = picked ? picked === "section" : isSectionProp;
  const [title, setTitle] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (open && !isSection) {
      listTemplatesAction().then((list) => {
        setTemplates(list);
        setTemplateId(null);
      });
    }
  }, [open, isSection]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    startTransition(async () => {
      try {
        const page = await createPageAction({ title: title.trim(), parentId, isSection, templateId });
        toast.success(`${isSection ? "Section" : "Page"} "${page.title}" created`);
        setTitle("");
        setPicked(null);
        onOpenChange(false);
        if (!isSection) router.push(`/cms/${page.id}`);
      } catch {
        toast.error("Could not create — check your permissions.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setPicked(null);
        onOpenChange(o);
      }}
    >
      <DialogContent className={templates.length > 0 ? "max-w-lg" : undefined}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create new {isSection ? "folder" : "page"}</DialogTitle>
            <DialogDescription>
              {isSection
                ? "Sections group related pages in the content tree and aren't published on their own."
                : "New pages start as a draft until you publish them."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Please select the page type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["page", "Page (menu item)", "An ordinary page, such as Contact us or a news story.", FileText],
                    ["section", "Folder", "Groups other pages in the tree. Not shown on its own.", Folder],
                  ] as const
                ).map(([key, label, hint, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPicked(key)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg border p-3 text-left hover:border-somerset-green/60",
                      (isSection ? "section" : "page") === key && "border-somerset-green bg-somerset-green/10",
                    )}
                  >
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-neutral-500" />
                    <span>
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-neutral-500">{hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              {onLinkExisting && (
                <button
                  type="button"
                  className="text-xs font-medium text-somerset-green underline"
                  onClick={() => {
                    onOpenChange(false);
                    onLinkExisting();
                  }}
                >
                  Link an existing page instead
                </button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-page-title">Page name</Label>
              <Input
                id="new-page-title"
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={isSection ? "e.g. Places To Stay" : "e.g. Cheddar Gorge"}
              />
            </div>

            {!isSection && (
              <div className="space-y-2">
                <Label>Start from</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateId(null)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-center hover:border-somerset-green/60",
                      templateId === null && "border-somerset-green bg-somerset-green/10",
                    )}
                  >
                    <FileText className="h-5 w-5 text-neutral-400" />
                    <span className="text-xs font-medium">Blank page</span>
                  </button>
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      title={t.description ?? undefined}
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-center hover:border-somerset-green/60",
                        templateId === t.id && "border-somerset-green bg-somerset-green/10",
                      )}
                    >
                      <LayoutTemplate className="h-5 w-5 text-neutral-400" />
                      <span className="text-xs font-medium">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !title.trim()}>
              {pending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
