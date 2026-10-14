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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Plus, Trash2, Copy, ChevronUp, ChevronDown, LayoutTemplate, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusDot } from "@/components/cms/status-dot";
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
import { TreeRow } from "./tree-row";
import { CreatePageDialog } from "./create-page-dialog";
import { clonePageAction, deletePageAction, reorderPageAction } from "@/app/cms/actions";
import type { PageTreeNode, TreeCapabilities } from "./types";
import Link from "next/link";

// Every ancestor id on the path down to `targetId`, so navigating straight to
// a deep page (a direct link, browser back/forward, search result) reveals
// it in the tree without needing to expand every branch by hand.
function findAncestorIds(nodes: PageTreeNode[], targetId: string, path: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return path;
    const found = findAncestorIds(n.children, targetId, [...path, n.id]);
    if (found) return found;
  }
  return null;
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

function findNodeById(nodes: PageTreeNode[], id: string): PageTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const f = findNodeById(n.children, id);
    if (f) return f;
  }
  return null;
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
  // Only the top level starts open — with 5,000+ real pages, defaulting to
  // "everything expanded" used to mount every row in the tree at once (the
  // main cause of the content hub feeling sluggish). Whatever page is active
  // on load still has its ancestor chain expanded, so you're never dropped
  // into a collapsed tree with no idea where the current page lives.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set(tree.map((n) => n.id));
    if (activePageId) {
      const ancestors = findAncestorIds(tree, activePageId);
      ancestors?.forEach((id) => ids.add(id));
    }
    return ids;
  });
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // The tree persists across CMS navigations (it lives in the layout), so
  // this handles clicking straight to a different deep page — expand its
  // ancestors without collapsing whatever the user already had open. Adjusts
  // state during render (React's documented pattern for "reset/adjust state
  // when a prop changes") rather than in an effect, avoiding an extra render.
  const [lastActivePageId, setLastActivePageId] = useState(activePageId);
  if (activePageId !== lastActivePageId) {
    setLastActivePageId(activePageId);
    const ancestors = activePageId ? findAncestorIds(tree, activePageId) : null;
    if (ancestors?.length) {
      setExpanded((prev) => new Set([...prev, ...ancestors]));
    }
  }

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
            className={`flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-[#d4ecec] ${
              n.id === activePageId ? "bg-[#d5eaea] font-medium" : ""
            }`}
          >
            <StatusDot status={n.status} />
            <span className="truncate">{n.title}</span>
          </Link>
        ))}
      </div>
    );
  }

  const activeNode = activePageId ? findNodeById(tree, activePageId) : null;

  function moveActive(delta: -1 | 1) {
    if (!activeNode) return;
    const group = findGroup(tree, activeNode.parentId);
    if (!group) return;
    const from = group.findIndex((n) => n.id === activeNode.id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= group.length) return;
    const reordered = arrayMove(group, from, to);
    startTransition(async () => {
      await Promise.all(reordered.map((n, index) => reorderPageAction(n.id, activeNode.parentId, index)));
    });
  }

  const iconBtn = "flex h-7 w-7 items-center justify-center rounded text-[#3a3a3a] hover:bg-[#d4ecec] disabled:cursor-not-allowed disabled:opacity-35";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-0.5 border-b border-[#c9c9c4] px-2 py-2">
        <button
          type="button"
          className={iconBtn}
          title="New page"
          disabled={!caps.canCreate}
          onClick={() => {
            setCreateSection(false);
            setCreateOpen(true);
          }}
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>
        <button type="button" className={iconBtn} title="Delete" disabled={!caps.canDelete || !activeNode} onClick={() => setConfirmDelete(true)}>
          <Trash2 className="h-[17px] w-[17px] fill-[#3a3a3a]" />
        </button>
        <button
          type="button"
          className={iconBtn}
          title="Copy"
          disabled={!caps.canClone || !activeNode || activeNode.isSection}
          onClick={() =>
            activeNode &&
            startTransition(async () => {
              try {
                const cloned = await clonePageAction(activeNode.id);
                toast.success("Page copied");
                router.push(`/cms/${cloned.id}`);
              } catch {
                toast.error("Could not copy — check your permissions.");
              }
            })
          }
        >
          <Copy className="h-[17px] w-[17px] fill-[#3a3a3a]" />
        </button>
        <button type="button" className={iconBtn} title="Move up" disabled={!caps.canReorder || !activeNode} onClick={() => moveActive(-1)}>
          <ChevronUp className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button type="button" className={iconBtn} title="Move down" disabled={!caps.canReorder || !activeNode} onClick={() => moveActive(1)}>
          <ChevronDown className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <button type="button" className={iconBtn} title="Search" onClick={() => setSearchOpen((o) => !o)}>
          <Search className="h-[17px] w-[17px]" strokeWidth={2.5} />
        </button>
      </div>

      {searchOpen && (
        <div className="relative border-b border-[#c9c9c4] p-2">
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pages..."
            className="h-8 rounded-sm border-[#b9c8c8] bg-[#f4fcfc] pr-7 text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute top-1/2 right-4 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto py-2">
        <Link href="/cms" className="flex items-center gap-1 px-1 pb-1 text-[14px] text-[#262524] hover:bg-[#d4ecec]">
          <span className="flex h-5 w-5 items-center justify-center">
            <span className="flex size-[13px] items-center justify-center rounded-full bg-[#0e6c9c] text-[11px] leading-none font-bold text-white">−</span>
          </span>
          <LayoutTemplate className="h-4 w-4 fill-[#4a4a4a] text-white" />
          <span className="truncate">Visit Somerset</span>
        </Link>
        <DndContext id="content-tree" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {renderNodes(visibleTree, 0)}
        </DndContext>
        {visibleTree.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-neutral-400">No pages match &ldquo;{search}&rdquo;.</p>
        )}
      </div>

      <CreatePageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentId={activeNode ? activeNode.id : null}
        isSection={createSection}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{activeNode?.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the page{activeNode && activeNode.children.length > 0 ? " and everything nested inside it" : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!activeNode) return;
                startTransition(async () => {
                  try {
                    await deletePageAction(activeNode.id);
                    toast.success("Deleted");
                    router.push("/cms");
                  } catch {
                    toast.error("Could not delete — check your permissions.");
                  }
                });
                setConfirmDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
