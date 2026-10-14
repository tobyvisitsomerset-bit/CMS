import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWidgetUsage } from "@/lib/data/widget-usage";
import { WIDGETS, widgetGuideMarkdown } from "@/lib/widget-catalogue";

// Staff download of the widget guide (Markdown or JSON).
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Forbidden", { status: 403 });

  const format = new URL(request.url).searchParams.get("format");
  const usage = await getWidgetUsage();

  if (format === "json") {
    const body = JSON.stringify(
      WIDGETS.map((w) => ({ ...w, usedOn: usage[w.type] ?? [] })),
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": 'attachment; filename="visit-somerset-widgets.json"',
      },
    });
  }

  return new NextResponse(widgetGuideMarkdown(usage), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'attachment; filename="visit-somerset-widget-guide.md"',
    },
  });
}
