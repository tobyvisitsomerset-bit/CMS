"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { listVersionsAction, rollbackVersionAction } from "@/app/cms/actions";

type VersionRow = {
  id: string;
  versionNumber: number;
  changeSummary: string | null;
  createdAt: Date;
  editor: { name: string } | null;
};

export function VersionHistorySheet({ pageId, canEdit }: { pageId: string; canEdit: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => {
        setVersions(await listVersionsAction(pageId));
      });
    }
  }

  function handleRollback(versionId: string) {
    startTransition(async () => {
      try {
        await rollbackVersionAction(versionId);
        toast.success("Rolled back");
        setConfirmId(null);
        setOpen(false);
        router.refresh();
      } catch {
        toast.error("Could not roll back — check your permissions.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <Clock className="h-4 w-4" /> Page History
      </Button>
      <Sheet open={open} onOpenChange={handleOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Version history</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
            {pending && versions.length === 0 && <p className="text-sm text-neutral-400">Loading...</p>}
            {!pending && versions.length === 0 && <p className="text-sm text-neutral-400">No versions saved yet.</p>}
            {versions.map((v, i) => (
              <div key={v.id} className="flex items-start justify-between gap-2 border-b pb-3">
                <div>
                  <p className="text-sm font-medium">
                    Version {v.versionNumber}
                    {i === 0 && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] text-emerald-700">Current</span>}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {v.editor?.name ?? "System"} · {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                  </p>
                  {v.changeSummary && <p className="mt-0.5 text-xs text-neutral-400">{v.changeSummary}</p>}
                </div>
                {canEdit && i !== 0 && (
                  <Button size="sm" variant="outline" onClick={() => setConfirmId(v.id)}>
                    <RotateCcw className="h-3.5 w-3.5" /> Rollback
                  </Button>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmId} onOpenChange={(o) => !o && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Roll back to this version?</AlertDialogTitle>
            <AlertDialogDescription>
              This replaces the current content and sections with this version&apos;s snapshot. The current state is kept as its own version, so you can roll forward again if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && handleRollback(confirmId)}>Roll back</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
