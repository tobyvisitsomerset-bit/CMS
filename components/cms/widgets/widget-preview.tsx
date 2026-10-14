import { BlockRenderer } from "@/components/cms/page-builder/block-renderer";
import { resolveBlockData } from "@/lib/data/block-data";
import type { BlockType } from "@/components/cms/page-builder/block-types";
import { sampleConfig } from "@/lib/widget-samples";

// Draws a widget exactly as it renders on the public site, using example
// content (and real data for the widgets that fill themselves from the site).
export async function WidgetPreview({ type, layout }: { type: BlockType; layout?: string }) {
  const config = sampleConfig(type, layout);
  const block = { id: "preview", type, config: JSON.stringify(config) };
  const data = await resolveBlockData([block]);
  return (
    <BlockRenderer
      type={type}
      config={config}
      realData={data.preview}
      pageSlug={type === "experiences_hub" ? "book-experiences" : "places-to-stay"}
      pageTitle="Preview"
    />
  );
}

// A frame that shows a preview at a smaller size, without letting any link or
// button inside it be clicked.
export function PreviewFrame({ children, scale = 1, height }: { children: React.ReactNode; scale?: number; height?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white" style={height ? { height } : undefined}>
      <div
        className="pointer-events-none select-none"
        style={scale === 1 ? undefined : { transform: `scale(${scale})`, transformOrigin: "top left", width: `${100 / scale}%` }}
      >
        {children}
      </div>
    </div>
  );
}
