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

export async function applyTemplateToPage(pageId: string, templateId: string) {
  const template = await prisma.pageTemplate.findUnique({ where: { id: templateId } });
  if (!template) return;
  const blocks: TemplateBlock[] = JSON.parse(template.blocks);
  if (blocks.length === 0) return;
  await prisma.contentBlock.createMany({
    data: blocks.map((b, i) => ({ pageId, type: b.type, sortOrder: i, config: JSON.stringify(b.config) })),
  });
}
