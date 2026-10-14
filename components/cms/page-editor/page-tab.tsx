"use client";

import { Pencil } from "lucide-react";
import { PagePreview } from "./page-preview";
import { blockLabel } from "@/components/cms/page-builder/block-types";
import type { ListingsByCategory, RealBlockData } from "@/components/cms/page-builder/block-renderer";
import type { getPageById, ChildPageTile } from "@/lib/data/pages";
import type { DetailExtras } from "@/lib/data/detail-extras";

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
}: {
  page: PageDetail;
  listings: ListingsByCategory;
  extras: DetailExtras;
  childPages: ChildPageTile[];
  blockData: Record<string, RealBlockData>;
  readOnly: boolean;
  onEditWidget: (blockId: string) => void;
  onEditForm: () => void;
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
        {!hasWidgets && !readOnly && (
          <button
            type="button"
            onClick={onEditForm}
            className="inline-flex items-center gap-1.5 rounded-md bg-somerset-green px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit page fields
          </button>
        )}
      </div>
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
