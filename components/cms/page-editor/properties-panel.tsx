"use client";

import { useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PropertiesTab } from "./properties-tab";
import { SeoTab } from "./seo-tab";
import { VersionHistorySheet } from "./version-history-sheet";
import { AuditLogSheet } from "./audit-log-sheet";
import type { getPageById } from "@/lib/data/pages";
import type { listMembers } from "@/lib/data/users";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

const SUB_TABS = [
  { key: "general", label: "General" },
  { key: "urls", label: "URLs" },
  { key: "metadata", label: "Metadata" },
  { key: "versions", label: "Versions" },
  { key: "history", label: "History" },
] as const;

type SubTab = (typeof SUB_TABS)[number]["key"];

// Kentico 11's Properties tab and its sub-tabs. General holds ownership,
// visibility and who the page is assigned to; Metadata is the SEO and social
// sharing settings with their live Google/social preview.
export function PropertiesPanel({
  page,
  members,
  canManageMembers,
  canEdit,
}: {
  page: PageDetail;
  members: Awaited<ReturnType<typeof listMembers>>;
  canManageMembers: boolean;
  canEdit: boolean;
}) {
  const [sub, setSub] = useState<SubTab>("general");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = `${origin}/${page.slug}`;

  return (
    <div>
      <div className="flex gap-1 border-b bg-neutral-50 px-4">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSub(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              sub === t.key ? "border-somerset-green text-somerset-green" : "border-transparent text-neutral-500 hover:text-neutral-800",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {sub === "general" && <PropertiesTab page={page} members={members} canManage={canManageMembers} />}

      {sub === "metadata" && <SeoTab page={page} readOnly={!canEdit} />}

      {sub === "urls" && (
        <div className="mx-auto max-w-2xl space-y-5 p-6 text-sm">
          <div>
            <p className="text-xs tracking-wide text-neutral-400 uppercase">Public address</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded border bg-white px-3 py-2">{publicUrl}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(publicUrl);
                  toast("Address copied");
                }}
                className="rounded border p-2 text-neutral-500 hover:bg-neutral-100"
                title="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
              {page.status === "PUBLISHED" && (
                <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded border p-2 text-neutral-500 hover:bg-neutral-100" title="Open">
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            {page.status !== "PUBLISHED" && <p className="mt-1 text-xs text-neutral-400">This page isn&apos;t published yet, so the address won&apos;t load.</p>}
          </div>
          <div>
            <p className="text-xs tracking-wide text-neutral-400 uppercase">URL slug</p>
            <p className="mt-1 text-neutral-700">/{page.slug}</p>
            <p className="mt-1 text-xs text-neutral-400">To change it, edit <strong>Slug</strong> in the Form tab, under General.</p>
          </div>
          {page.canonicalUrl && (
            <div>
              <p className="text-xs tracking-wide text-neutral-400 uppercase">Canonical URL (set in Metadata)</p>
              <p className="mt-1 text-neutral-700">{page.canonicalUrl}</p>
            </div>
          )}
        </div>
      )}

      {sub === "versions" && (
        <div className="mx-auto max-w-2xl space-y-3 p-6 text-sm text-neutral-600">
          <p>Every save keeps a version of the page. You can compare and roll back to an earlier one.</p>
          <VersionHistorySheet pageId={page.id} canEdit={canEdit} />
        </div>
      )}

      {sub === "history" && (
        <div className="mx-auto max-w-2xl space-y-3 p-6 text-sm text-neutral-600">
          <p>Who did what to this page and when — saves, publishing, archiving and assignments.</p>
          <AuditLogSheet pageId={page.id} />
        </div>
      )}
    </div>
  );
}
