import type { PageTreeNode } from "@/lib/data/pages";

export type { PageTreeNode };

export type TreeCapabilities = {
  canCreate: boolean;
  canClone: boolean;
  canArchive: boolean;
  canDelete: boolean;
  canReorder: boolean;
};
