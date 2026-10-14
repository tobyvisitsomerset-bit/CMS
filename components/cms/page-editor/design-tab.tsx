"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, Plus, BookmarkPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BLOCK_DEFS, blockLabel, defaultConfigFor, type BlockType } from "@/components/cms/page-builder/block-types";
import { WIDGETS, WIDGET_CATEGORIES } from "@/lib/widget-catalogue";
import { BlockRenderer, type ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
import { BlockConfigForm } from "@/components/cms/page-builder/block-config-form";
import {
  addContentBlockAction,
  deleteContentBlockAction,
  reorderContentBlocksAction,
  saveAsTemplateAction,
  updateContentBlockAction,
} from "@/app/cms/actions";

type Block = { id: string; type: string; sortOrder: number; config: string };

function SortableBlockRow({
  block,
  onEdit,
  onDelete,
  listings,
}: {
  block: Block;
  onEdit: () => void;
  onDelete: () => void;
  listings: ListingsByCategory;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const config = JSON.parse(block.config || "{}");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group overflow-hidden rounded-lg border bg-white ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 border-b bg-neutral-50 px-3 py-1.5">
        <button {...attributes} {...listeners} className="cursor-grab text-neutral-300 hover:text-neutral-500 active:cursor-grabbing">
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-neutral-500">{blockLabel(block.type)}</span>
        <div className="flex-1" />
        <Button size="icon-sm" variant="ghost" onClick={onEdit} title="Edit widget properties">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onDelete} title="Remove widget">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="pointer-events-none max-h-64 overflow-hidden text-[13px]">
        <BlockRenderer type={block.type} config={config} listings={listings} />
      </div>
    </div>
  );
}

export function DesignTab({
  pageId,
  initialBlocks,
  readOnly,
  listings,
  openBlockId,
  onOpened,
}: {
  pageId: string;
  initialBlocks: Block[];
  readOnly: boolean;
  listings: ListingsByCategory;
  openBlockId?: string | null;
  onOpened?: () => void;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initialBlocks);
  // Arriving from the Page tab's "Edit widget" button opens that widget's
  // properties straight away (the tab remounts, so a lazy initial state does it).
  const arrivedAt = !readOnly && openBlockId ? (initialBlocks.find((b) => b.id === openBlockId) ?? null) : null;
  const [editing, setEditing] = useState<Block | null>(arrivedAt);
  const [editingConfig, setEditingConfig] = useState<Record<string, unknown>>(() =>
    arrivedAt ? JSON.parse(arrivedAt.config || "{}") : {},
  );
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  useEffect(() => {
    if (openBlockId) onOpened?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAdd(type: BlockType) {
    startTransition(async () => {
      const block = await addContentBlockAction(pageId, type);
      const newBlock = { ...block, config: JSON.stringify(defaultConfigFor(type)) };
      setBlocks((b) => [...b, newBlock as Block]);
      await updateContentBlockAction(block.id, defaultConfigFor(type));
      toast.success(`${blockLabel(type)} widget added`);
    });
  }

  function openEdit(block: Block) {
    setEditing(block);
    setEditingConfig(JSON.parse(block.config || "{}"));
  }

  function saveEdit() {
    if (!editing) return;
    startTransition(async () => {
      await updateContentBlockAction(editing.id, editingConfig);
      setBlocks((b) => b.map((x) => (x.id === editing.id ? { ...x, config: JSON.stringify(editingConfig) } : x)));
      toast.success("Widget updated");
      setEditing(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContentBlockAction(id);
      setBlocks((b) => b.filter((x) => x.id !== id));
      setConfirmDeleteId(null);
      toast.success("Widget removed");
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(blocks, oldIndex, newIndex);
    setBlocks(reordered);
    startTransition(() => reorderContentBlocksAction(pageId, reordered.map((b) => b.id)));
  }

  function handleSaveAsTemplate() {
    if (!templateName.trim()) return;
    startTransition(async () => {
      try {
        await saveAsTemplateAction(pageId, templateName.trim(), templateDescription.trim() || undefined);
        toast.success(`Saved as template "${templateName.trim()}"`);
        setTemplateDialogOpen(false);
        setTemplateName("");
        setTemplateDescription("");
      } catch {
        toast.error("Could not save template — a template with that name may already exist.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      {!readOnly && (
        <div className="flex justify-end gap-2">
          {blocks.length > 0 && (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setTemplateDialogOpen(true)}>
              <BookmarkPlus className="h-4 w-4" /> Save as template
            </Button>
          )}
          <Button size="sm" disabled={pending} onClick={() => setGalleryOpen(true)}>
            <Plus className="h-4 w-4" /> Add widget
          </Button>
        </div>
      )}

      <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">Zone: Main content</p>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-neutral-400">
          No widgets in this zone yet. Use “Add widget” to start building this page.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {blocks.map((block) => (
                <SortableBlockRow
                  key={block.id}
                  block={block}
                  onEdit={() => openEdit(block)}
                  onDelete={() => setConfirmDeleteId(block.id)}
                  listings={listings}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Sheet open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent className="w-[420px] overflow-y-auto sm:max-w-[420px]">
          <SheetHeader>
            <SheetTitle>{editing ? blockLabel(editing.type) : ""} — widget properties</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">
            {editing && (
              <BlockConfigForm
                type={editing.type as BlockType}
                config={editingConfig}
                setConfig={(updater) => setEditingConfig((c) => updater(c))}
              />
            )}
          </div>
          <SheetFooter>
            <Button onClick={saveEdit} disabled={pending}>
              {pending ? "Saving..." : "Save widget"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select widget</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-1">
            {WIDGET_CATEGORIES.filter((c) => c.name !== "Legacy").map((cat) => {
              const items = WIDGETS.filter((w) => w.category === cat.name && !w.legacy);
              if (items.length === 0) return null;
              return (
                <div key={cat.name}>
                  <p className="text-sm font-semibold text-neutral-800">{cat.name}</p>
                  <p className="mb-2 text-xs text-neutral-500">{cat.blurb}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((w) => {
                      const def = BLOCK_DEFS.find((d) => d.type === w.type);
                      const Icon = def?.icon;
                      return (
                        <button
                          key={w.type}
                          type="button"
                          onClick={() => {
                            setGalleryOpen(false);
                            handleAdd(w.type);
                          }}
                          className="flex gap-3 rounded-lg border p-3 text-left transition-colors hover:border-somerset-green hover:bg-somerset-green/5"
                        >
                          {Icon && (
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-somerset-green/10 text-somerset-green">
                              <Icon className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-neutral-900">{w.name}</span>
                            <span className="line-clamp-2 block text-xs text-neutral-500">{w.summary}</span>
                            {w.data === "Live data from the site" && (
                              <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                                Fills itself from the live site
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this widget?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="template-name">Template name</Label>
              <Input
                id="template-name"
                autoFocus
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Business detail"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea
                id="template-description"
                rows={2}
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
              />
            </div>
            <p className="text-xs text-neutral-400">
              This saves the current widgets as a reusable starting point — future edits to this page won&apos;t
              change the template.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAsTemplate} disabled={pending || !templateName.trim()}>
              {pending ? "Saving..." : "Save template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {blocks.length > 0 && (
        <div className="pt-4">
          <p className="mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wide">Preview of this zone</p>
          <div className="overflow-hidden rounded-lg border bg-white">
            {blocks.map((block) => (
              <BlockRenderer key={block.id} type={block.type} config={JSON.parse(block.config || "{}")} listings={listings} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
