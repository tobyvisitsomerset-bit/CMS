"use client";

import { Pencil } from "lucide-react";
import { PagePreview } from "./page-preview";
import { ChangeTemplateButton } from "./change-template-dialog";
import { FixSectionBanner } from "./fix-section-banner";
import { blockLabel } from "@/components/cms/page-builder/block-types";
import type { ListingsByCategory, RealBlockData } from "@/components/cms/page-builder/block-renderer";
import type { getPageById, ChildPageTile } from "@/lib/data/pages";
import type { DetailExtras } from "@/lib/data/detail-extras";
import type { ListingDiagnostics } from "@/lib/data/listing-diagnostics";

type PageDetail = NonNullable<Awaited<ReturnType<typeof getPageById>>>;

// Kentico's "Page" tab: the page as visitors will see it, with each editable
// region marked. Hover a widget and click it to open its properties; a page
// without widgets is edited through the Form tab.
export function PageTab({
  page,
  listings,
  extras,
  childPages,
  blockData,
  readOnly,
  onEditWidget,
  onEditForm,
  diagnostics,
}: {
  page: PageDetail;
  listings: ListingsByCategory;
  extras: DetailExtras;
  childPages: ChildPageTile[];
  blockData: Record<string, RealBlockData>;
  readOnly: boolean;
  onEditWidget: (blockId: string) => void;
  onEditForm: () => void;
  diagnostics?: ListingDiagnostics;
}) {
  const hasWidgets = page.contentBlocks.length > 0;
  return (
    <div className="bg-stone-100 py-4">
      <div className="mx-auto mb-3 flex max-w-5xl items-center justify-between gap-3 px-4 text-sm text-neutral-600">
        <p>
          {hasWidgets
            ? "Hover a widget and click Edit to change its properties."
            : "This page is built from fields — edit its text, address and prices in the Form tab."}
        </p>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <ChangeTemplateButton pageId={page.id} pageTitle={page.title} />
            {!hasWidgets && (
              <button
                type="button"
                onClick={onEditForm}
                className="inline-flex items-center gap-1.5 rounded-md bg-somerset-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit page fields
              </button>
            )}
          </div>
        )}
      </div>
      {diagnostics && (diagnostics.problems.length > 0 || diagnostics.appearsOn.length > 0 || diagnostics.alsoOn.length > 0 || diagnostics.unmarkedBelow > 0) && (
        <div className="mx-auto mb-3 max-w-5xl px-4">
          {diagnostics.problems.length > 0 ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <p className="font-semibold">Not showing in the lists yet</p>
              <ul className="mt-1 list-disc pl-5">
                {diagnostics.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-md border border-somerset-green/30 bg-somerset-green/5 px-3 py-2 text-sm text-neutral-700">
              {diagnostics.appearsOn.length > 0 && <div>Listed on: {diagnostics.appearsOn.map((a) => a.title).join(", ")}</div>}
              {diagnostics.alsoOn.length > 0 && <div>Also linked into: {diagnostics.alsoOn.join(", ")}</div>}
            </div>
          )}
        </div>
      )}
      {diagnostics && diagnostics.unmarkedBelow > 0 && !readOnly && (
        <div className="mx-auto mb-3 max-w-5xl px-4">
          <FixSectionBanner pageId={page.id} count={diagnostics.unmarkedBelow} />
        </div>
      )}
      <div
        className="mx-auto max-w-[1280px] overflow-hidden bg-white shadow-sm"
        // Links and forms inside the canvas are inert — this is an editing view.
        onClickCapture={(e) => {
          const el = e.target as HTMLElement;
          if (el.closest("a") && !el.closest("[data-edit-widget]")) e.preventDefault();
        }}
        onSubmitCapture={(e) => e.preventDefault()}
      >
        <PagePreview
          page={page}
          listings={listings}
          extras={extras}
          childPages={childPages}
          blockData={blockData}
          wrapBlock={(id, type, node) => (
            <div className="group/widget relative">
              <div className="pointer-events-none absolute inset-0 z-10 ring-2 ring-inset ring-transparent transition-shadow group-hover/widget:ring-somerset-green/70" />
              {!readOnly && (
                <button
                  type="button"
                  data-edit-widget
                  onClick={() => onEditWidget(id)}
                  className="absolute top-3 right-3 z-20 hidden items-center gap-1.5 rounded-md bg-somerset-green px-3 py-1.5 text-xs font-semibold text-white shadow group-hover/widget:inline-flex"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit {blockLabel(type)}
                </button>
              )}
              {node}
            </div>
          )}
        />
      </div>
    </div>
  );
}
