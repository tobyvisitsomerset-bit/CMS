import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Printer } from "lucide-react";
import { auth } from "@/lib/auth";
import { getWidgetUsage } from "@/lib/data/widget-usage";
import { WIDGETS, WIDGET_CATEGORIES } from "@/lib/widget-catalogue";
import { blockIcon } from "@/components/cms/page-builder/block-types";

export const dynamic = "force-dynamic";

export default async function WidgetsApplicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usage = await getWidgetUsage();

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">Widgets</h1>
          <p className="mt-1 max-w-2xl text-sm text-neutral-500">
            Every widget you can add in a page&apos;s <strong>Design</strong> tab, what it does, and what each property means. Export it as a
            training guide for your team.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cms/widgets/guide"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            <Printer className="h-4 w-4" /> Printable guide
          </Link>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
          <a
            href="/cms/widgets/export?format=md"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" /> Markdown
          </a>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page */}
          <a
            href="/cms/widgets/export?format=json"
            className="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            <Download className="h-4 w-4" /> JSON
          </a>
        </div>
      </div>

      {WIDGET_CATEGORIES.map((cat) => {
        const items = WIDGETS.filter((w) => w.category === cat.name);
        if (items.length === 0) return null;
        return (
          <section key={cat.name}>
            <h2 className="text-sm font-semibold text-neutral-800">{cat.name}</h2>
            <p className="mb-3 text-xs text-neutral-500">{cat.blurb}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((w) => {
                const Icon = blockIcon(w.type);
                const used = usage[w.type]?.length ?? 0;
                return (
                  <Link
                    key={w.type}
                    href={`/cms/widgets/${w.type}`}
                    className="flex gap-3 rounded-lg border bg-white p-4 transition-shadow hover:shadow-md"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-somerset-green/10 text-somerset-green">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-neutral-900">{w.name}</span>
                      <span className="mt-0.5 line-clamp-2 block text-xs text-neutral-500">{w.summary}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">{w.data}</span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
                          {used === 0 ? "Not used yet" : `Used on ${used} page${used === 1 ? "" : "s"}`}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
