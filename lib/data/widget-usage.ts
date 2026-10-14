import { prisma } from "@/lib/prisma";
import type { WidgetUsage } from "@/lib/widget-catalogue";

// Which pages use each widget type today — read live from the content blocks
// so the training guide always shows real examples.
export async function getWidgetUsage(): Promise<WidgetUsage> {
  const rows = await prisma.contentBlock.findMany({
    where: { page: { status: { not: "ARCHIVED" } } },
    select: { type: true, page: { select: { slug: true, title: true } } },
    take: 2000,
  });
  const usage: WidgetUsage = {};
  for (const r of rows) {
    const list = (usage[r.type] ??= []);
    if (!list.some((p) => p.slug === r.page.slug)) list.push({ slug: r.page.slug, title: r.page.title });
  }
  return usage;
}
