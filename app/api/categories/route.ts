import { z } from 'zod';
import { actor, body, fail, reply } from '@/lib/access/server';
import { categoryTree, categoryTreeForAdmins, database, updateCategoryTree, type CategoryNode } from '@/lib/store-data';

const categoryInput = z.object({
  id: z.string().optional(),
  parentId: z.string().nullable().optional(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).optional(),
  image: z.string().max(500).default(''),
  enabled: z.boolean().default(true),
  status: z.enum(['Active','Inactive','Draft']).optional(),
  displayOrder: z.number().int().min(0).max(9999).default(0),
  description: z.string().max(400).default(''),
  metaTitle: z.string().max(160).default(''),
  metaKeywords: z.string().max(1000).default(''),
  metaDescription: z.string().max(320).default(''),
  parentCategoryId: z.string().nullable().optional(),
  depth: z.number().int().min(0).max(10).optional(),
});

export async function GET() {
  try {
    const categories = await categoryTree();
    return reply({ categories });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    await actor('content.edit');
    const data = await body(req);
    const action = z.enum(['save','delete']).parse(data.action);

    if (action === 'delete') {
      const id = z.string().min(1).parse(data.id);
      const categories = await categoryTreeForAdmins();
      const idsToDelete = new Set<string>();
      const allCategories: CategoryNode[] = [];
      const flatten = (nodes: CategoryNode[]) => nodes.forEach((node) => { allCategories.push(node); flatten(node.children); });
      flatten(categories);
      const collect = (nodeId: string) => {
        idsToDelete.add(nodeId);
        const children = allCategories.filter((item) => item.parentId === nodeId);
        children.forEach((child) => collect(child.id));
      };
      collect(id);
      const db = database();
      if (db && idsToDelete.size) {
        const ids = Array.from(idsToDelete);
        await db.prepare(`DELETE FROM category_nodes WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).run();
      }
      return reply({ ok: true, categories: await categoryTree() });
    }

    const item = categoryInput.parse(data.item ?? data);
    const parentId = item.parentId ?? item.parentCategoryId ?? null;
    const categories = await categoryTreeForAdmins();
    const flat: CategoryNode[] = [];
    const flatten = (nodes: CategoryNode[]) => nodes.forEach((node) => { flat.push(node); flatten(node.children); });
    flatten(categories);
    const parent = parentId ? flat.find((node) => node.id === parentId) : null;
    const next = await updateCategoryTree({
      id: item.id ?? crypto.randomUUID(),
      parentId,
      name: item.name,
      slug: item.slug ?? item.name,
      image: item.image,
      enabled: item.status ? item.status === 'Active' : item.enabled,
      displayOrder: item.displayOrder,
      description: item.description,
      metaTitle: item.metaTitle,
      metaKeywords: item.metaKeywords,
      metaDescription: item.metaDescription,
      depth: item.depth ?? (parent ? parent.depth + 1 : 0),
    });

    return reply({ ok: true, categories: next });
  } catch (error) {
    return fail(error);
  }
}
