"use client";

import { usePathname } from "next/navigation";
import { ContentTree } from "@/components/cms/content-tree/content-tree";
import { TopBar } from "@/components/cms/top-bar";
import type { PageTreeNode, TreeCapabilities } from "@/components/cms/content-tree/types";

function findNode(nodes: PageTreeNode[], id: string): PageTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

const NAMED_ROUTES: Record<string, string> = {
  media: "Media Library",
  approvals: "Approvals",
};

export function CmsShell({
  user,
  tree,
  caps,
  flatMember,
  canManageMedia,
  canReviewWorkflow,
  children,
}: {
  user: { name: string; roleName: string };
  tree: PageTreeNode[];
  caps: TreeCapabilities;
  flatMember?: boolean;
  canManageMedia: boolean;
  canReviewWorkflow: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const segment = pathname?.startsWith("/cms/") ? pathname.split("/")[2] : undefined;
  const namedRoute = segment ? NAMED_ROUTES[segment] : undefined;
  const activeNode = segment && !namedRoute ? findNode(tree, segment) : null;

  return (
    <div className="flex h-screen flex-col">
      <TopBar
        user={user}
        canManageMedia={canManageMedia}
        canReviewWorkflow={canReviewWorkflow}
        breadcrumb={[
          { label: "Pages", href: "/cms" },
          { label: namedRoute ?? (activeNode ? activeNode.title : "(root)") },
        ]}
      />
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r bg-neutral-50">
          <ContentTree tree={tree} activePageId={namedRoute ? undefined : segment} caps={caps} flatMember={flatMember} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto bg-neutral-100">{children}</main>
      </div>
    </div>
  );
}
