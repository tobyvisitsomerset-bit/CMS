import type { PageStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<PageStatus, { color: string; label: string }> = {
  PUBLISHED: { color: "bg-emerald-500", label: "Published" },
  DRAFT: { color: "bg-amber-400", label: "Draft" },
  PENDING_APPROVAL: { color: "bg-sky-500", label: "Pending approval" },
  ARCHIVED: { color: "bg-red-500", label: "Archived" },
};

export function StatusDot({ status, className }: { status: PageStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      title={style.label}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", style.color, className)}
    />
  );
}

export function StatusBadgeLabel({ status }: { status: PageStatus }) {
  return STATUS_STYLES[status].label;
}
