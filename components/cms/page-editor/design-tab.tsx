"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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
import { GripVertical, Menu, Pencil, Trash2, BookmarkPlus, Search } from "lucide-react";
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
  readOnly,
  onEdit,
  onDelete,
  listings,
}: {
  block: Block;
  readOnly: boolean;
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
      className={`border border-[#c9c9c4] bg-white ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 bg-[#f0f0ee] px-2 py-1">
        {!readOnly && (
          <button {...attributes} {...listeners} className="cursor-grab text-[#7a7a76] hover:text-[#262524] active:cursor-grabbing" aria-label="Drag to reorder">
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className="text-[13px] font-semibold text-[#262524]">{blockLabel(block.type)}</span>
        <div className="flex-1" />
        {!readOnly && (
          <>
            <button type="button" onClick={onEdit} title="Widget properties" className="rounded p-1 text-[#4a4947] hover:bg-[#dededa]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={onDelete} title="Remove widget" className="rounded p-1 text-[#4a4947] hover:bg-[#dededa]">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
      <div className="pointer-events-none max-h-40 overflow-hidden text-[13px]">
        <BlockRenderer type={block.type} config={config} listings={listings} />
      </div>
    </div>
  );
}

function templateNameFor(blocks: Block[]) {
  if (blocks.some((b) => b.type === "listing_explorer")) return "Listing page";
  if (blocks.some((b) => b.type === "hero" && b.config.includes('"showSearchBar":true'))) return "Home";
  return "Widgets page";
}

// Kentico 11's Design view: the page template's zones as coloured bars, and
// the widget list on the right to pick from.
export function DesignTab({
  pageId,
  pageSlug,
  initialBlocks,
  readOnly,
  listings,
  openBlockId,
  onOpened,
}: {
  pageId: string;
  pageSlug: string;
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
  const [category, setCategory] = useState<string>("All widgets");
  const [query, setQuery] = useState("");
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

  const visibleWidgets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WIDGETS.filter((w) => !w.legacy)
      .filter((w) => category === "All widgets" || w.category === category)
      .filter((w) => !q || `${w.name} ${w.summary}`.toLowerCase().includes(q));
  }, [category, query]);

  return (
    <div className="flex min-h-full">
      {/* Zones */}
      <div className="min-w-0 flex-1 p-4">
        <div className="bg-[#84b45c] px-3 py-2 text-[14px] text-[#1f2a14]">
          <strong>/{pageSlug}</strong> - page template: <strong>{templateNameFor(blocks)}</strong>
        </div>

        <div className="mt-1">
          <div className="flex items-center gap-2 bg-[#efb24c] px-3 py-2 text-[14px] text-[#3b2a07]">
            <Menu className="h-4 w-4" /> ZoneMain
          </div>
          <div className="bg-[#e4e4e2] px-3 py-3 text-[13px] text-[#6a6966]">
            The page&apos;s own content (title, summary, address, prices…) — set in the <strong>Form</strong> tab.
          </div>
        </div>

        <div className="mt-1">
          <div className="flex items-center gap-2 bg-[#efb24c] px-3 py-2 text-[14px] text-[#3b2a07]">
            <Menu className="h-4 w-4" /> (Editor) ZoneWidgets
            <div className="flex-1" />
            {!readOnly && blocks.length > 0 && (
              <button
                type="button"
                disabled={pending}
                onClick={() => setTemplateDialogOpen(true)}
                className="flex items-center gap-1 text-[12px] font-semibold text-[#3b2a07] hover:underline"
              >
                <BookmarkPlus className="h-3.5 w-3.5" /> Save as template
              </button>
            )}
          </div>
          <div className="space-y-2 bg-[#e4e4e2] p-2">
            {blocks.length === 0 ? (
              <p className="px-2 py-6 text-center text-[13px] text-[#6a6966]">
                No widgets in this zone yet. Pick one from the widget list on the right to add it.
              </p>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {blocks.map((block) => (
                      <SortableBlockRow
                        key={block.id}
                        block={block}
                        readOnly={readOnly}
                        onEdit={() => openEdit(block)}
                        onDelete={() => setConfirmDeleteId(block.id)}
                        listings={listings}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      {/* Widget list */}
      {!readOnly && (
        <aside className="w-[300px] shrink-0 border-l border-[#c9c9c4] bg-[#e9ffff] p-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mb-2 w-full border border-[#b3b3ae] bg-white px-2 py-1.5 text-[13px]"
          >
            <option>All widgets</option>
            {WIDGET_CATEGORIES.filter((c) => c.name !== "Legacy").map((c) => (
              <option key={c.name}>{c.name}</option>
            ))}
          </select>
          <div className="relative mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets..."
              className="w-full border border-[#b3b3ae] bg-white px-2 py-1.5 pr-7 text-[13px]"
            />
            <Search className="pointer-events-none absolute top-1/2 right-2 h-3.5 w-3.5 -translate-y-1/2 text-[#6a6966]" />
          </div>
          <div className="space-y-4">
            {WIDGET_CATEGORIES.filter((c) => c.name !== "Legacy").map((cat) => {
              const items = visibleWidgets.filter((w) => w.category === cat.name);
              if (items.length === 0) return null;
              return (
                <div key={cat.name}>
                  <p className="mb-1 text-[16px] font-semibold text-[#1d6a89]">{cat.name}</p>
                  <ul>
                    {items.map((w) => {
                      const def = BLOCK_DEFS.find((d) => d.type === w.type);
                      const Icon = def?.icon;
                      return (
                        <li key={w.type}>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => handleAdd(w.type)}
                            title={w.summary}
                            className="flex w-full items-center gap-2 px-1 py-1.5 text-left text-[13px] text-[#262524] hover:bg-[#d4ecec]"
                          >
                            {Icon && <Icon className="h-4 w-4 shrink-0 text-[#4a4947]" />}
                            <span className="truncate">{w.name}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {visibleWidgets.length === 0 && <p className="text-[13px] text-[#6a6966]">No widgets match.</p>}
          </div>
        </aside>
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
            <Button onClick={saveEdit} disabled={pending} className="rounded-none bg-[#467c07] text-white hover:bg-[#3b6a05]">
              {pending ? "Saving..." : "Save widget"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
              <Input id="template-name" autoFocus value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Business detail" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="template-description">Description (optional)</Label>
              <Textarea id="template-description" rows={2} value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} />
            </div>
            <p className="text-xs text-neutral-400">
              This saves the current widgets as a reusable starting point — future edits to this page won&apos;t change the template.
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
    </div>
  );
}
