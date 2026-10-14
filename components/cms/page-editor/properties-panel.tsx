"use client";

import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PropertiesTab } from "./properties-tab";
import { SeoTab } from "./seo-tab";
import { MediaTab } from "./media-tab";
import { VersionHistorySheet } from "./version-history-sheet";
import { AuditLogSheet } from "./audit-log-sheet";
import { widgetByType } from "@/lib/widget-catalogue";
import type { getPageById } from "@/lib/data/pages";
import type { listMembers } from "@/lib/data/users";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

// The sections under Kentico 11's Properties menu. Each one is a full page in
// the editor area; the menu itself lives in the tab bar.
export type PropertiesSection = "general" | "urls" | "template" | "metadata" | "workflow" | "versions" | "security" | "attachments";

export const PROPERTIES_MENU: { key: PropertiesSection; label: string }[] = [
  { key: "general", label: "General" },
  { key: "urls", label: "URLs" },
  { key: "template", label: "Template" },
  { key: "metadata", label: "Metadata" },
  { key: "workflow", label: "Workflow" },
  { key: "versions", label: "Versions" },
  { key: "security", label: "Security" },
  { key: "attachments", label: "Attachments" },
];

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h2 className="mb-3 bg-[#e5e5e5] px-4 py-2 text-[15px] font-semibold text-[#262524]">{title}</h2>
      <div className="space-y-4 px-2 text-sm">{children}</div>
    </div>
  );
}

export function PropertiesPanel({
  section,
  page,
  members,
  canManageMembers,
  canEdit,
}: {
  section: PropertiesSection;
  page: PageDetail;
  members: Awaited<ReturnType<typeof listMembers>>;
  canManageMembers: boolean;
  canEdit: boolean;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/${page.slug}`;

  if (section === "general" || section === "security") {
    return <PropertiesTab page={page} members={members} canManage={canManageMembers} section={section} />;
  }

  if (section === "metadata") return <SeoTab page={page} readOnly={!canEdit} />;
  if (section === "attachments") return <MediaTab page={page} />;

  if (section === "urls") {
    return (
      <Box title="URLs">
        <div>
          <p className="text-xs tracking-wide text-neutral-500 uppercase">Public address</p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 border bg-white px-3 py-2">{publicUrl}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(publicUrl);
                toast("Address copied");
              }}
              className="border bg-white p-2 text-neutral-600 hover:bg-neutral-100"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            {page.status === "PUBLISHED" && (
              <a href={publicUrl} target="_blank" rel="noreferrer" className="border bg-white p-2 text-neutral-600 hover:bg-neutral-100" title="Open">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          {page.status !== "PUBLISHED" && <p className="mt-1 text-xs text-neutral-500">This page isn&apos;t published yet, so the address won&apos;t load.</p>}
        </div>
        <div>
          <p className="text-xs tracking-wide text-neutral-500 uppercase">URL path</p>
          <p className="mt-1">/{page.slug}</p>
          <p className="mt-1 text-xs text-neutral-500">To change it, edit <strong>Slug</strong> in the Form tab, under General.</p>
        </div>
      </Box>
    );
  }

  if (section === "template") {
    const kinds = page.contentBlocks.map((b) => widgetByType(b.type)?.name ?? b.type);
    const template =
      page.contentBlocks.length > 0
        ? page.contentBlocks.some((b) => b.type === "listing_explorer")
          ? "Listing page"
          : page.contentBlocks.some((b) => b.type === "hero" && b.config.includes("showSearchBar\":true"))
            ? "Home"
            : "Widgets page"
        : page.customFields?.includes("ItemMapLatitude") || page.customFields?.includes("ItemStartDate")
          ? "Business / event detail"
          : "Content page";
    return (
      <Box title="Template">
        <p>
          <span className="text-neutral-500">Page template:</span> <strong>{template}</strong>
        </p>
        <p className="text-neutral-600">
          The template decides the page&apos;s zones. Widgets pages have <strong>ZoneMain</strong> (set from the Form tab) and an editor zone{" "}
          <strong>(Editor) ZoneWidgets</strong> where widgets are added in the Design tab.
        </p>
        {kinds.length > 0 && (
          <div>
            <p className="text-xs tracking-wide text-neutral-500 uppercase">Widgets on this page</p>
            <ol className="mt-1 list-decimal pl-5">
              {kinds.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ol>
          </div>
        )}
      </Box>
    );
  }

  if (section === "versions") {
    return (
      <Box title="Versions">
        <p className="text-neutral-600">Every save keeps a version of the page. Compare and roll back to an earlier one.</p>
        <VersionHistorySheet pageId={page.id} canEdit={canEdit} />
      </Box>
    );
  }

  // workflow
  return (
    <Box title="Workflow">
      <p>
        <span className="text-neutral-500">Current step:</span>{" "}
        <strong>
          {page.status === "PUBLISHED"
            ? "Published"
            : page.status === "PENDING_APPROVAL"
              ? "Pending approval"
              : page.status === "ARCHIVED"
                ? "Archived"
                : "Draft"}
        </strong>
      </p>
      <p className="text-neutral-600">
        Draft → (members: Submit for review → Pending approval) → Published → Archived. Use the buttons above the form to move the page along.
      </p>
      <p className="text-neutral-600">History of who did what to this page:</p>
      <AuditLogSheet pageId={page.id} />
    </Box>
  );
}
