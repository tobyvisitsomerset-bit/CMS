"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  ChevronRight,
  Folder,
  FileText,
  GripVertical,
  Link2,
  MoreHorizontal,
  Plus,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cn } from "@/lib/utils";
import { StatusDot } from "@/components/cms/status-dot";
import { CreatePageDialog } from "./create-page-dialog";
import type { PageTreeNode, TreeCapabilities } from "./types";
import {
  archivePageAction,
  clonePageAction,
  deletePageAction,
  restorePageAction,
} from "@/app/cms/actions";

export function TreeRow({
  node,
  depth,
  expanded,
  onToggle,
  activePageId,
  caps,
  draggable,
}: {
  node: PageTreeNode;
  depth: number;
  expanded: boolean;
  onToggle: () => void;
  activePageId?: string;
  caps: TreeCapabilities;
  draggable: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [createSection, setCreateSection] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    data: { parentId: node.parentId },
    disabled: !draggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasChildren = node.children.length > 0;
  const isActive = node.id === activePageId;

  function runAction(fn: () => Promise<unknown>, successMsg: string) {
    startTransition(async () => {
      try {
        await fn();
        toast.success(successMsg);
      } catch {
        toast.error("Action failed — check your permissions.");
      }
    });
  }

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "opacity-50")}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-neutral-100",
          isActive && "bg-emerald-50 text-emerald-900 font-medium",
        )}
        style={{ paddingLeft: depth * 14 + 4 }}
      >
        {draggable ? (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-0.5 text-neutral-300 opacity-0 group-hover:opacity-100 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="w-4" />
        )}

        <button
          onClick={onToggle}
          className={cn("flex h-5 w-5 items-center justify-center text-neutral-400", !hasChildren && "invisible")}
        >
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>

        {node.isSection ? (
          <Folder className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : node.linkedPageId ? (
          <Link2 className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        ) : (
          <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        )}

        {node.isSection ? (
          <button onClick={onToggle} className="flex-1 truncate py-1.5 text-left">
            {node.title}
          </button>
        ) : (
          <Link
            href={`/cms/${node.id}`}
            className={cn("flex-1 truncate py-1.5", node.linkedPageId && "text-neutral-500 italic")}
            title={node.linkedPageId ? "Linked page — opens the original for editing" : undefined}
          >
            {node.title}
          </Link>
        )}

        {!node.isSection && <StatusDot status={node.status} className="mr-1" />}

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded p-1 text-neutral-400 opacity-0 hover:bg-neutral-200 group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {caps.canCreate && node.isSection && (
              <>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateSection(false);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> New page
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setCreateSection(true);
                    setCreateOpen(true);
                  }}
                >
                  <Folder className="h-3.5 w-3.5" /> New section
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {caps.canClone && !node.isSection && (
              <DropdownMenuItem
                onClick={() =>
                  runAction(async () => {
                    const cloned = await clonePageAction(node.id);
                    router.push(`/cms/${cloned.id}`);
                  }, "Page cloned")
                }
              >
                <Copy className="h-3.5 w-3.5" /> Clone
              </DropdownMenuItem>
            )}
            {caps.canArchive && !node.isSection && node.status !== "ARCHIVED" && (
              <DropdownMenuItem onClick={() => runAction(() => archivePageAction(node.id), "Page archived")}>
                <Archive className="h-3.5 w-3.5" /> Archive
              </DropdownMenuItem>
            )}
            {caps.canArchive && !node.isSection && node.status === "ARCHIVED" && (
              <DropdownMenuItem onClick={() => runAction(() => restorePageAction(node.id), "Page restored")}>
                <ArchiveRestore className="h-3.5 w-3.5" /> Restore
              </DropdownMenuItem>
            )}
            {caps.canDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <CreatePageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        parentId={node.id}
        isSection={createSection}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{node.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the {node.isSection ? "section" : "page"}
              {hasChildren ? " and everything nested inside it" : ""}. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                runAction(async () => {
                  await deletePageAction(node.id);
                  if (isActive) router.push("/cms");
                }, "Deleted");
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
