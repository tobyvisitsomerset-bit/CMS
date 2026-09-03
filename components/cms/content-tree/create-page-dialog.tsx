"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, LayoutTemplate } from "lucide-react";
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
  isSection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string | null;
  isSection: boolean;
}) {
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
        onOpenChange(false);
        if (!isSection) router.push(`/cms/${page.id}`);
      } catch {
        toast.error("Could not create — check your permissions.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={templates.length > 0 ? "max-w-lg" : undefined}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isSection ? "Create section" : "Create page"}</DialogTitle>
            <DialogDescription>
              {isSection
                ? "Sections group related pages in the content tree and aren't published on their own."
                : "New pages start as a draft until you publish them."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-page-title">Title</Label>
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
                      "flex flex-col items-center gap-1 rounded-lg border p-3 text-center hover:border-emerald-400",
                      templateId === null && "border-emerald-500 bg-emerald-50",
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
                        "flex flex-col items-center gap-1 rounded-lg border p-3 text-center hover:border-emerald-400",
                        templateId === t.id && "border-emerald-500 bg-emerald-50",
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
