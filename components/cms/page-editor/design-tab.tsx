"use client";

import { useState, useTransition } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
        <Button size="icon-sm" variant="ghost" onClick={onEdit} title="Edit section">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onDelete} title="Remove section">
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
}: {
  pageId: string;
  initialBlocks: Block[];
  readOnly: boolean;
  listings: ListingsByCategory;
}) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initialBlocks);
  const [editing, setEditing] = useState<Block | null>(null);
  const [editingConfig, setEditingConfig] = useState<Record<string, unknown>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [pending, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleAdd(type: BlockType) {
    startTransition(async () => {
      const block = await addContentBlockAction(pageId, type);
      const newBlock = { ...block, config: JSON.stringify(defaultConfigFor(type)) };
      setBlocks((b) => [...b, newBlock as Block]);
      await updateContentBlockAction(block.id, defaultConfigFor(type));
      toast.success(`${blockLabel(type)} section added`);
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
      toast.success("Section updated");
      setEditing(null);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteContentBlockAction(id);
      setBlocks((b) => b.filter((x) => x.id !== id));
      setConfirmDeleteId(null);
      toast.success("Section removed");
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
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" disabled={pending}>
                  <Plus className="h-4 w-4" /> Add section
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-64">
              {BLOCK_DEFS.map((def) => (
                <DropdownMenuItem key={def.type} onClick={() => handleAdd(def.type)}>
                  <def.icon className="h-4 w-4" />
                  <div>
                    <div>{def.label}</div>
                    <div className="text-xs text-neutral-400">{def.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-neutral-400">
          No sections yet. Add one above to start building this page.
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
            <SheetTitle>{editing ? blockLabel(editing.type) : ""} settings</SheetTitle>
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
              {pending ? "Saving..." : "Save section"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this section?</AlertDialogTitle>
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
              This saves the current sections as a reusable starting point — future edits to this page won&apos;t
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
          <p className="mb-2 text-xs font-medium text-neutral-400 uppercase tracking-wide">Live preview</p>
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
