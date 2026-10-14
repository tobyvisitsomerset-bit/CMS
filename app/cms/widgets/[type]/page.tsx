import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { getWidgetUsage } from "@/lib/data/widget-usage";
import { widgetByType } from "@/lib/widget-catalogue";

export const dynamic = "force-dynamic";

export default async function WidgetDetailPage({ params }: { params: Promise<{ type: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { type } = await params;
  const widget = widgetByType(type);
  if (!widget) notFound();
  const usage = (await getWidgetUsage())[widget.type] ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/cms/widgets" className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800">
        <ArrowLeft className="h-4 w-4" /> All widgets
      </Link>
      <div>
        <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">{widget.category}</p>
        <h1 className="text-2xl font-semibold text-neutral-900">{widget.name}</h1>
        <p className="mt-2 text-neutral-600">{widget.summary}</p>
      </div>

      <dl className="divide-y rounded-lg border bg-white text-sm">
        <div className="grid grid-cols-[10rem_1fr] gap-4 p-4">
          <dt className="text-neutral-500">When to use it</dt>
          <dd>{widget.whenToUse}</dd>
        </div>
        <div className="grid grid-cols-[10rem_1fr] gap-4 p-4">
          <dt className="text-neutral-500">Content comes from</dt>
          <dd>
            {widget.data}
            {widget.dataNote && <span className="block text-neutral-500">{widget.dataNote}</span>}
          </dd>
        </div>
        <div className="grid grid-cols-[10rem_1fr] gap-4 p-4">
          <dt className="text-neutral-500">Used on</dt>
          <dd>
            {usage.length === 0 ? (
              "Not used yet"
            ) : (
              <ul className="space-y-1">
                {usage.map((u) => (
                  <li key={u.slug}>
                    <a href={`/${u.slug}`} target="_blank" rel="noreferrer" className="text-somerset-green hover:underline">
                      {u.title}
                    </a>{" "}
                    <span className="text-neutral-400">/{u.slug}</span>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>

      {widget.properties.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Properties</h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs text-neutral-500 uppercase">
                <tr>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">What it does</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {widget.properties.map((p) => (
                  <tr key={p.name} className="align-top">
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-neutral-500">{p.type}</td>
                    <td className="px-3 py-2 text-neutral-600">{p.help}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {widget.tips.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-neutral-800">Tips</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
            {widget.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
