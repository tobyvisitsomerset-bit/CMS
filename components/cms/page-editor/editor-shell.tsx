"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditorMode } from "@/components/cms/editor-mode-context";
import { EditorToolbar } from "./editor-toolbar";
import { PageTab } from "./page-tab";
import { FormTab } from "./form-tab";
import { DesignTab } from "./design-tab";
import { RoomsReviewsTab } from "./rooms-reviews-tab";
import { MasterPageTab } from "./master-page-tab";
import { PropertiesPanel, PROPERTIES_MENU, type PropertiesSection } from "./properties-panel";
import { PagePreview } from "./page-preview";
import { ListingPreview } from "./listing-preview";
import type { ListingsByCategory, RealBlockData } from "@/components/cms/page-builder/block-renderer";
import type { getPageById, ChildPageTile } from "@/lib/data/pages";
import type { DetailExtras } from "@/lib/data/detail-extras";
import type { listMembers } from "@/lib/data/users";
import type { MasterSettings } from "@/lib/data/site-settings";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;
type Tab = "page" | "design" | "form" | "master" | "properties";

const TABS: { key: Exclude<Tab, "properties">; label: string }[] = [
  { key: "page", label: "Page" },
  { key: "design", label: "Design" },
  { key: "form", label: "Form" },
  { key: "master", label: "Master page" },
];

// Kentico 11's page editor: the grey tab bar (Page · Design · Form ·
// Master page · Properties ▾), then the toolbar, then the working area. The
// Edit / Preview / Listing switch sits above the content tree.
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
  const { mode, setMode } = useEditorMode();
  const [tab, setTab] = useState<Tab>("page");
  const [section, setSection] = useState<PropertiesSection>("general");
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

  const toolbar = (showSave: boolean) => (
    <EditorToolbar
      pageId={page.id}
      status={page.status}
      canEdit={canEdit}
      canPublish={canPublish}
      canArchive={canArchive}
      canReview={canReview}
      isMember={isMember}
      notify={notify}
      onNotifyChange={setNotify}
      onSave={save}
      onSpellCheck={spellCheck}
      showSave={showSave}
      onViewLive={() => {
        // A DRAFT/ARCHIVED page has no real public URL to open — fall
        // back to the internal Preview mode rather than a 404.
        if (page.status === "PUBLISHED") {
          window.open(`${window.location.origin}/${page.slug}`, "_blank", "noopener,noreferrer");
        } else {
          setMode("preview");
        }
      }}
    />
  );

  const tabBtn = (active: boolean) =>
    cn(
      "h-[26px] px-4 text-[14px] leading-none transition-colors",
      active ? "bg-[#e9ffff] text-[#262524]" : "text-[#262524] hover:bg-[#e2e2de]",
    );

  return (
    <div className="flex h-full flex-col">
      {mode === "edit" && (
        <>
          <div className="flex shrink-0 items-end gap-0 bg-[#d9d9d6] px-3 pt-2">
            {TABS.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)} className={tabBtn(tab === t.key)}>
                {t.label}
              </button>
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger className={cn(tabBtn(tab === "properties"), "flex items-center gap-1")}>
                Properties <ChevronDown className="h-3 w-3 fill-current" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 rounded-none border-0 bg-[#403f3e] p-0 text-white">
                {PROPERTIES_MENU.map((m) => (
                  <DropdownMenuItem
                    key={m.key}
                    className="rounded-none px-4 py-2 text-[14px] text-white focus:bg-[#5a5958] focus:text-white"
                    onClick={() => {
                      setSection(m.key);
                      setTab("properties");
                    }}
                  >
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {tab !== "master" && toolbar(tab === "form" || (tab === "properties" && section === "metadata"))}

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
                pageSlug={page.slug}
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
                <div className="mx-auto max-w-5xl px-6 pb-10">
                  <h2 className="mb-2 bg-[#e5e5e5] px-4 py-2 text-[15px] font-semibold text-[#262524]">Rooms &amp; reviews</h2>
                  <RoomsReviewsTab page={page} readOnly={!canEdit} />
                </div>
              </div>
            )}
            {tab === "master" && <MasterPageTab initial={master} readOnly={!canPublish} />}
            {tab === "properties" && (
              <PropertiesPanel
                section={section}
                page={page}
                members={members}
                canManageMembers={canManageMembers}
                canEdit={canEdit}
              />
            )}
          </div>
        </>
      )}

      {mode === "preview" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#e9ffff]">
          <PagePreview page={page} listings={listings} extras={extras} childPages={childPages} blockData={blockData} />
        </div>
      )}

      {mode === "listing" && (
        <div className="min-h-0 flex-1 overflow-y-auto bg-[#e9ffff]">
          <ListingPreview page={page} />
        </div>
      )}
    </div>
  );
}
