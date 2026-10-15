import { prisma } from "@/lib/prisma";

export type TemplateBlock = { type: string; config: Record<string, unknown> };

export async function listTemplates() {
  return prisma.pageTemplate.findMany({ orderBy: { name: "asc" } });
}

export async function getTemplate(id: string) {
  return prisma.pageTemplate.findUnique({ where: { id } });
}

export async function createTemplateFromPage(
  pageId: string,
  name: string,
  description: string | undefined,
  createdById: string,
) {
  const blocks = await prisma.contentBlock.findMany({
    where: { pageId },
    orderBy: { sortOrder: "asc" },
    select: { type: true, config: true },
  });
  const payload: TemplateBlock[] = blocks.map((b) => ({ type: b.type, config: JSON.parse(b.config || "{}") }));

  return prisma.pageTemplate.create({
    data: {
      name,
      description,
      blocks: JSON.stringify(payload),
      createdById,
    },
  });
}

export async function deleteTemplate(id: string) {
  return prisma.pageTemplate.delete({ where: { id } });
}

// Template configs may contain {{slug}}, {{title}}, {{parentTitle}} and
// {{parentSlug}}, filled in from the page the template is applied to. That is
// how one "Section landing" template serves Hotels, Camping, Glamping and the
// rest without anyone rebuilding the widget for each.
function fillTokens(json: string, tokens: Record<string, string>): string {
  return json.replace(/\{\{(slug|title|parentTitle|parentSlug)\}\}/g, (_, k: string) =>
    // Insert as a JSON-safe string fragment.
    JSON.stringify(tokens[k] ?? "").slice(1, -1),
  );
}

/** Replaces whatever widgets the page has with the template's. Returns the number of widgets added. */
export async function applyTemplateToPage(pageId: string, templateId: string): Promise<number> {
  const template = await prisma.pageTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new Error("Template not found");
  const page = await prisma.page.findUnique({
    where: { id: pageId },
    select: { slug: true, title: true, parent: { select: { slug: true, title: true } } },
  });
  if (!page) throw new Error("Page not found");

  const tokens = {
    slug: page.slug,
    title: page.title,
    parentTitle: page.parent?.title ?? "",
    parentSlug: page.parent?.slug ?? "",
  };
  const blocks: TemplateBlock[] = JSON.parse(template.blocks);
  const rows = blocks.map((b, i) => ({
    pageId,
    type: b.type,
    sortOrder: i,
    config: fillTokens(JSON.stringify(b.config), tokens),
  }));

  await prisma.$transaction([
    prisma.contentBlock.deleteMany({ where: { pageId } }),
    ...(rows.length > 0 ? [prisma.contentBlock.createMany({ data: rows })] : []),
  ]);
  return rows.length;
}
