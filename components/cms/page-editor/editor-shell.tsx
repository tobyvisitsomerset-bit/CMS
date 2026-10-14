"use client";

import { useState } from "react";
import { SpellCheck } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ModeSwitch, type EditorMode } from "./mode-switch";
import { StatusActions } from "./status-actions";
import { PageTab } from "./page-tab";
import { FormTab } from "./form-tab";
import { DesignTab } from "./design-tab";
import { RoomsReviewsTab } from "./rooms-reviews-tab";
import { MasterPageTab } from "./master-page-tab";
import { PropertiesPanel } from "./properties-panel";
import { PagePreview } from "./page-preview";
import { ListingPreview } from "./listing-preview";
import type { ListingsByCategory, RealBlockData } from "@/components/cms/page-builder/block-renderer";
import type { getPageById, ChildPageTile } from "@/lib/data/pages";
import type { DetailExtras } from "@/lib/data/detail-extras";
import type { listMembers } from "@/lib/data/users";
import type { MasterSettings } from "@/lib/data/site-settings";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

// Kentico 11's page editor: Edit / Preview / Listing modes; in Edit mode the
// tabs Page · Design · Form · Master page · Properties, with Save, Archive,
// Spell check and "Send notification emails" in the toolbar.
export function EditorShell({
  page,
  canEdit,
  canPublish,
  canArchive,
  canReview,
  isMember,
  listings,
  extras,
  childPages,
  blockData,
  members,
  canManageMembers,
  master,
}: {
  page: PageDetail;
  canEdit: boolean;
  canPublish: boolean;
  canArchive: boolean;
  canReview: boolean;
  isMember: boolean;
  listings: ListingsByCategory;
  extras: DetailExtras;
  childPages: ChildPageTile[];
  blockData: Record<string, RealBlockData>;
  members: Awaited<ReturnType<typeof listMembers>>;
  canManageMembers: boolean;
  master: MasterSettings;
}) {
  const [mode, setMode] = useState<EditorMode>("edit");
  const [tab, setTab] = useState("page");
  const [notify, setNotify] = useState(true);
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);

  function save() {
    window.dispatchEvent(new Event("cms:save"));
  }

  function spellCheck() {
    // Turn the browser's own spell checker on for every text field on screen
    // and put the cursor in the first one so misspellings are underlined.
    const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("main input[type=text], main textarea");
    fields.forEach((el) => {
      el.spellcheck = true;
      el.setAttribute("lang", "en-GB");
    });
    fields[0]?.focus();
    toast("Spell check is on — misspelled words are underlined in the fields on this tab.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <ModeSwitch mode={mode} onChange={setMode} />
          {mode === "edit" && canEdit && (
            <>
              <Button size="sm" className="bg-somerset-green text-white hover:bg-somerset-green/90" onClick={save}>
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={spellCheck}>
                <SpellCheck className="h-4 w-4" /> Spell check
              </Button>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="size-4 accent-[#3d685b]"
                />
                Send notification emails
              </label>
            </>
          )}
        </div>
        <StatusActions
          pageId={page.id}
          status={page.status}
          canPublish={canPublish}
          canArchive={canArchive}
          canReview={canReview}
          isMember={isMember}
          notify={notify}
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
            <TabsTrigger value="page">Page</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="form">Form</TabsTrigger>
            <TabsTrigger value="master">Master page</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
          </TabsList>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tab === "page" && (
              <PageTab
                page={page}
                listings={listings}
                extras={extras}
                childPages={childPages}
                blockData={blockData}
                readOnly={!canEdit}
                onEditWidget={(id) => {
                  setOpenBlockId(id);
                  setTab("design");
                }}
                onEditForm={() => setTab("form")}
              />
            )}
            {tab === "design" && (
              <DesignTab
                pageId={page.id}
                initialBlocks={page.contentBlocks}
                readOnly={!canEdit}
                listings={listings}
                openBlockId={openBlockId}
                onOpened={() => setOpenBlockId(null)}
              />
            )}
            {tab === "form" && (
              <div>
                <FormTab page={page} readOnly={!canEdit} />
                <div className="mx-auto max-w-4xl px-6 pb-10">
                  <h2 className="mb-2 border-t pt-6 text-sm font-semibold text-neutral-700">Rooms &amp; reviews</h2>
                  <RoomsReviewsTab page={page} readOnly={!canEdit} />
                </div>
              </div>
            )}
            {tab === "master" && <MasterPageTab initial={master} readOnly={!canPublish} />}
            {tab === "properties" && (
              <PropertiesPanel page={page} members={members} canManageMembers={canManageMembers} canEdit={canEdit} />
            )}
          </div>
        </Tabs>
      )}

      {mode === "preview" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-stone-100 py-6">
          <PagePreview page={page} listings={listings} extras={extras} childPages={childPages} blockData={blockData} />
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
