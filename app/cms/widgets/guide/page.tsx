import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getWidgetUsage } from "@/lib/data/widget-usage";
import { WIDGETS, WIDGET_CATEGORIES } from "@/lib/widget-catalogue";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

// A clean, single-flow version of the widget catalogue that prints well —
// use the browser's "Save as PDF" to hand it to the editing teams.
export default async function WidgetGuidePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const usage = await getWidgetUsage();

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:p-0">
      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <p className="text-sm text-neutral-500">Use Print and choose &ldquo;Save as PDF&rdquo; to share this guide.</p>
        <PrintButton />
      </div>

      <h1 className="font-serif text-3xl font-black text-neutral-900">Visit Somerset — editor&apos;s widget guide</h1>
      <p className="mt-3 text-neutral-700">
        The site is edited the way you know from Kentico 11. Open a page in <strong>Pages</strong>, switch between <strong>Edit</strong>,{" "}
        <strong>Preview</strong> and <strong>Listing</strong>, and build the page in the <strong>Design</strong> tab by adding{" "}
        <strong>widgets</strong>. Each widget has properties you fill in; real-data widgets fill themselves from the live site.
      </p>

      <h2 className="mt-8 text-xl font-bold">Editing a page in five steps</h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-700">
        <li>Open <strong>Pages</strong> and choose a page in the content tree.</li>
        <li>In <strong>Edit</strong> mode, use the <strong>Form</strong> tab for the page&apos;s own details.</li>
        <li>Use the <strong>Design</strong> tab to add, reorder and edit widgets.</li>
        <li>Click <strong>Save</strong>, then check it in <strong>Preview</strong>.</li>
        <li><strong>Publish</strong> to make it live (members: <strong>Submit for review</strong>).</li>
      </ol>

      {WIDGET_CATEGORIES.map((cat) => {
        const items = WIDGETS.filter((w) => w.category === cat.name);
        if (items.length === 0) return null;
        return (
          <section key={cat.name} className="mt-10">
            <h2 className="border-b pb-1 text-xl font-bold">{cat.name}</h2>
            <p className="mt-1 text-sm text-neutral-500">{cat.blurb}</p>
            {items.map((w) => {
              const used = usage[w.type] ?? [];
              return (
                <article key={w.type} className="mt-6 break-inside-avoid">
                  <h3 className="text-lg font-semibold">{w.name}</h3>
                  <p className="mt-1 text-neutral-700">{w.summary}</p>
                  <ul className="mt-2 space-y-0.5 text-sm text-neutral-700">
                    <li>
                      <strong>When to use it:</strong> {w.whenToUse}
                    </li>
                    <li>
                      <strong>Content comes from:</strong> {w.data}
                      {w.dataNote ? ` — ${w.dataNote}` : ""}
                    </li>
                    <li>
                      <strong>Used on:</strong> {used.length ? used.map((u) => u.title).join(", ") : "not currently used"}
                    </li>
                  </ul>
                  {w.properties.length > 0 && (
                    <table className="mt-3 w-full border text-left text-sm">
                      <thead className="bg-neutral-100">
                        <tr>
                          <th className="border px-2 py-1">Property</th>
                          <th className="border px-2 py-1">Type</th>
                          <th className="border px-2 py-1">What it does</th>
                        </tr>
                      </thead>
                      <tbody>
                        {w.properties.map((p) => (
                          <tr key={p.name} className="align-top">
                            <td className="border px-2 py-1 font-medium">{p.name}</td>
                            <td className="border px-2 py-1 text-neutral-500">{p.type}</td>
                            <td className="border px-2 py-1">{p.help}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {w.tips.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">
                      {w.tips.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
