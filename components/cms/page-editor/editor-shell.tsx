"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModeSwitch, type EditorMode } from "./mode-switch";
import { StatusActions } from "./status-actions";
import { FormTab } from "./form-tab";
import { DesignTab } from "./design-tab";
import { SeoTab } from "./seo-tab";
import { MediaTab } from "./media-tab";
import { RoomsReviewsTab } from "./rooms-reviews-tab";
import { PropertiesTab } from "./properties-tab";
import { PagePreview } from "./page-preview";
import { ListingPreview } from "./listing-preview";
import type { ListingsByCategory } from "@/components/cms/page-builder/block-renderer";
import type { getPageById, getNearbyPages } from "@/lib/data/pages";
import type { listMembers } from "@/lib/data/users";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type NearbyPage = Awaited<ReturnType<typeof getNearbyPages>>[number];

export function EditorShell({
  page,
  canEdit,
  canPublish,
  canArchive,
  canReview,
  isMember,
  listings,
  nearby,
  members,
  canManageMembers,
}: {
  page: PageDetail;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
  isMember: boolean;
  listings: ListingsByCategory;
  nearby: NearbyPage[];
  members: Awaited<ReturnType<typeof listMembers>>;
  canManageMembers: boolean;
}) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [tab, setTab] = useState("form");

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
          onViewLive={() => {
            // A DRAFT/ARCHIVED page has no real public URL to open — fall
            // back to the internal Preview tab rather than a 404.
            if (page.status === "PUBLISHED") {
              window.open(`${window.location.origin}/${page.slug}`, "_blank", "noopener,noreferrer");
            } else {
              setMode("preview");
            }
          }}
        />
      </div>

      {mode === "edit" && (
        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList className="w-full justify-start rounded-none border-b bg-white px-4">
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="rooms-reviews">Rooms &amp; Reviews</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "form" && <FormTab page={page} readOnly={!canEdit} />}
            {tab === "rooms-reviews" && <RoomsReviewsTab page={page} readOnly={!canEdit} />}
            {tab === "design" && (
              <DesignTab pageId={page.id} initialBlocks={page.contentBlocks} readOnly={!canEdit} listings={listings} />
            )}
            {tab === "seo" && <SeoTab page={page} readOnly={!canEdit} />}
            {tab === "media" && <MediaTab page={page} />}
            {tab === "properties" && <PropertiesTab page={page} members={members} canManage={canManageMembers} />}
          </div>
        </Tabs>
      )}

      {mode === "preview" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 py-6">
          <PagePreview page={page} listings={listings} nearby={nearby} />
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
