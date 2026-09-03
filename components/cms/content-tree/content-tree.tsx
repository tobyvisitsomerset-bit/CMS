"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { Search, Plus, FolderPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/cms/status-dot";
import { TreeRow } from "./tree-row";
import { CreatePageDialog } from "./create-page-dialog";
import { reorderPageAction } from "@/app/cms/actions";
import type { PageTreeNode, TreeCapabilities } from "./types";
import Link from "next/link";

function collectIds(nodes: PageTreeNode[], acc: Set<string> = new Set()): Set<string> {
  for (const n of nodes) {
    acc.add(n.id);
    collectIds(n.children, acc);
  }
  return acc;
}

function filterTree(nodes: PageTreeNode[], query: string): PageTreeNode[] {
  const q = query.toLowerCase();
  const walk = (list: PageTreeNode[]): PageTreeNode[] =>
    list
      .map((n) => {
        const children = walk(n.children);
        const selfMatch = n.title.toLowerCase().includes(q);
        if (selfMatch || children.length > 0) {
          return { ...n, children };
        }
        return null;
      })
      .filter((n): n is PageTreeNode => n !== null);
  return walk(nodes);
}

function findGroup(nodes: PageTreeNode[], parentId: string | null): PageTreeNode[] | null {
  if (parentId === null) return nodes;
  for (const n of nodes) {
    if (n.id === parentId) return n.children;
    const found = findGroup(n.children, parentId);
    if (found) return found;
  }
  return null;
}

export function ContentTree({
  tree,
  activePageId,
  caps,
  flatMember,
}: {
  tree: PageTreeNode[];
  activePageId?: string;
  caps: TreeCapabilities;
  flatMember?: boolean;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => collectIds(tree));
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState(false);
  const [, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const visibleTree = useMemo(() => (search.trim() ? filterTree(tree, search) : tree), [tree, search]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeParentId = (active.data.current?.parentId as string | null) ?? null;
    const overParentId = (over.data.current?.parentId as string | null) ?? null;
    if (activeParentId !== overParentId) return; // reordering only within the same parent for now

    const group = findGroup(tree, activeParentId);
    if (!group) return;

    const oldIndex = group.findIndex((n) => n.id === active.id);
    const newIndex = group.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(group, oldIndex, newIndex);
    startTransition(async () => {
      await Promise.all(reordered.map((n, index) => reorderPageAction(n.id, activeParentId, index)));
    });
  }

  function renderNodes(nodes: PageTreeNode[], depth: number) {
    return (
      <SortableContext items={nodes.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        {nodes.map((node) => (
          <div key={node.id}>
            <TreeRow
              node={node}
              depth={depth}
              expanded={expanded.has(node.id)}
              onToggle={() => toggle(node.id)}
              activePageId={activePageId}
              caps={caps}
              draggable={caps.canReorder && !search.trim()}
            />
            {node.children.length > 0 && expanded.has(node.id) && renderNodes(node.children, depth + 1)}
          </div>
        ))}
      </SortableContext>
    );
  }

  if (flatMember) {
    return (
      <div className="flex flex-col gap-0.5 px-2">
        {tree.length === 0 && (
          <p className="px-2 py-4 text-sm text-neutral-400">No pages assigned to you yet.</p>
        )}
        {tree.map((n) => (
          <Link
            key={n.id}
            href={`/cms/${n.id}`}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-neutral-100 ${
              n.id === activePageId ? "bg-emerald-50 font-medium text-emerald-900" : ""
            }`}
          >
            <StatusDot status={n.status} />
            <span className="truncate">{n.title}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b p-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="h-8 pl-7 text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {caps.canCreate && (
          <>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="New page"
              onClick={() => {
                setCreateSection(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              title="New section"
              onClick={() => {
                setCreateSection(true);
                setCreateOpen(true);
              }}
            >
              <FolderPlus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        <DndContext id="content-tree" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {renderNodes(visibleTree, 0)}
        </DndContext>
        {visibleTree.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">No pages match &ldquo;{search}&rdquo;.</p>
        )}
      </div>

      <CreatePageDialog open={createOpen} onOpenChange={setCreateOpen} parentId={null} isSection={createSection} />
    </div>
  );
}
