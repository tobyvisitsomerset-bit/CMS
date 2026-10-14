import type { PageStatus } from "@prisma/client";
import { CheckCircle2, Clock, Pencil, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS: Record<PageStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  PUBLISHED: { label: "Published", cls: "fill-[#3a8a1f] text-white", Icon: CheckCircle2 },
  DRAFT: { label: "Draft", cls: "fill-[#e0a100] text-white", Icon: Pencil },
  PENDING_APPROVAL: { label: "Pending approval", cls: "fill-[#2b8bc9] text-white", Icon: Clock },
  ARCHIVED: { label: "Archived", cls: "fill-[#b3252b] text-white", Icon: XCircle },
};

// Kentico 11 shows page state as a coloured circle icon at the right of each
// tree row: green tick = published, red cross = archived.
export function StatusDot({ status, className }: { status: PageStatus; className?: string }) {
  const { label, cls, Icon } = STATUS[status];
  return (
    <span title={label} className={cn("inline-flex shrink-0", className)}>
      <Icon className={cn("h-4 w-4", cls)} />
    </span>
  );
}

export function StatusBadgeLabel({ status }: { status: PageStatus }) {
  return STATUS[status].label;
}
