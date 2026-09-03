"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModeSwitch, type EditorMode } from "./mode-switch";
import { StatusActions } from "./status-actions";
import { ContentTab } from "./content-tab";
import { DesignTab } from "./design-tab";
import { SeoTab } from "./seo-tab";
import { MediaTab } from "./media-tab";
import { PlaceholderTab } from "./placeholder-tab";
import { PagePreview } from "./page-preview";
import { ListingPreview } from "./listing-preview";
import type { ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
import type { getPageById } from "@/lib/data/pages";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

export function EditorShell({
  page,
  canEdit,
  canPublish,
  canArchive,
  canReview,
  isMember,
  listings,
}: {
  page: PageDetail;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
  isMember: boolean;
  listings: ListingsByCategory;
}) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [tab, setTab] = useState("content");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b bg-white px-6 py-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        <StatusActions
          pageId={page.id}
          status={page.status}
          canPublish={canPublish}
          canArchive={canArchive}
          canReview={canReview}
          canEdit={canEdit}
          isMember={isMember}
          onViewLive={() => setMode("preview")}
        />
      </div>

      {mode === "edit" && (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-white px-4">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "content" && <ContentTab page={page} readOnly={!canEdit} />}
            {tab === "design" && (
              <DesignTab pageId={page.id} initialBlocks={page.contentBlocks} readOnly={!canEdit} listings={listings} />
            )}
            {tab === "seo" && <SeoTab page={page} readOnly={!canEdit} />}
            {tab === "media" && <MediaTab page={page} />}
            {tab === "properties" && <PlaceholderTab title="Ownership, assignment & visibility" phase="Phase 3" />}
          </div>
        </Tabs>
      )}

      {mode === "preview" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-100">
          <PagePreview page={page} listings={listings} />
        </div>
      )}

      {mode === "listing" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-100">
          <ListingPreview page={page} />
        </div>
      )}
    </div>
  );
}
