"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getPageAuditLogAction } from "@/app/cms/actions";

type AuditRow = {
  id: string;
  action: string;
  details: string | null;
  createdAt: Date;
  user: { name: string } | null;
};

export function AuditLogSheet({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [pending, startTransition] = useTransition();

  function handleOpen(next: boolean) {
    setOpen(next);
    if (next) {
      startTransition(async () => {
        setRows(await getPageAuditLogAction(pageId));
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <Button variant="outline" size="sm" onClick={() => handleOpen(true)}>
        <History className="h-4 w-4" /> Audit Log
      </Button>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Audit log</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 overflow-y-auto px-4 pb-4">
          {pending && <p className="text-sm text-neutral-400">Loading...</p>}
          {!pending && rows.length === 0 && <p className="text-sm text-neutral-400">No activity recorded yet.</p>}
          {rows.map((row) => (
            <div key={row.id} className="border-b pb-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium capitalize">{row.action}</span>
                <span className="text-xs text-neutral-400">
                  {formatDistanceToNow(new Date(row.createdAt), { addSuffix: true })}
                </span>
              </div>
              <div className="text-xs text-neutral-500">
                {row.user?.name ?? "System"}
                {row.details ? ` — ${row.details}` : ""}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
