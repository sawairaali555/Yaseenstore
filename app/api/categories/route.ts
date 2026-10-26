import { z } from 'zod';
import { actor, actorGuard, audit, body, fail, reply, sql } from '@/lib/access/server';
import { catalog, categoryTree, categoryTreeForAdmins, database, syncCategoryAvailability, updateCategoryTree, type CategoryNode } from '@/lib/store-data';

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

export async function GET(req: Request) {
  try {
    const admin = new URL(req.url).searchParams.get('includeDisabled') === '1';
    if (admin) await actor('content.edit');
    const categories = admin ? await syncCategoryAvailability() : await categoryTree();
    return reply({ categories });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await actor('content.edit');
    const data = await body(req);
    const action = z.enum(['save','delete','sync-availability']).parse(data.action);

    if (action === 'sync-availability') {
      const categories = await syncCategoryAvailability();
      return reply({ ok: true, categories });
    }

    if (action === 'delete') {
      const id = z.string().min(1).parse(data.id);
      const categories = await categoryTreeForAdmins();
      const idsToDelete = new Set<string>();
      const allCategories: CategoryNode[] = [];
      const flatten = (nodes: CategoryNode[]) => nodes.forEach((node) => { allCategories.push(node); flatten(node.children); });
      flatten(categories);
      if (!allCategories.some(node => node.id === id)) return reply({ error: 'Category not found.' }, 404);
      const collect = (nodeId: string) => {
        idsToDelete.add(nodeId);
        const children = allCategories.filter((item) => item.parentId === nodeId);
        children.forEach((child) => collect(child.id));
      };
      collect(id);
      const names = new Set(allCategories.filter(node => idsToDelete.has(node.id)).map(node => node.name));
      if ((await catalog(true)).some(product => [product.category, product.subcategory, product.childCategory].some(name => name && names.has(name)))) return reply({ error: 'This category contains products. Move or remove those products before deleting it.' }, 409);
      const db = database();
      if (db && idsToDelete.size) {
        await db.batch([
          ...actorGuard(user),
          ...allCategories.filter(node => idsToDelete.has(node.id)).map(node => sql('INSERT INTO category_nodes (id,parent_id,name,slug,enabled,depth,deleted) VALUES (?,?,?,?,0,?,1) ON CONFLICT(id) DO UPDATE SET deleted=1,enabled=0', node.id, node.parentId, node.name, node.slug, node.depth)),
          await audit(user, 'content.category_deleted', id, 'Category and descendants deleted', { ids: [...idsToDelete] }),
        ]);
      }
      return reply({ ok: true, categories: await categoryTreeForAdmins() });
    }

    const item = categoryInput.parse(data.item ?? data);
    const parentId = item.parentId ?? item.parentCategoryId ?? null;
    const categories = await categoryTreeForAdmins();
    const flat: CategoryNode[] = [];
    const flatten = (nodes: CategoryNode[]) => nodes.forEach((node) => { flat.push(node); flatten(node.children); });
    flatten(categories);
    const parent = parentId ? flat.find((node) => node.id === parentId) : null;
    if (parentId && !parent) return reply({ error: 'Parent category not found.' }, 400);
    if (item.id && !flat.some(node => node.id === item.id)) return reply({ error: 'Category not found.' }, 404);
    let ancestor = parent;
    while (ancestor) {
      if (ancestor.id === item.id) return reply({ error: 'A category cannot be moved beneath itself or its descendants.' }, 400);
      ancestor = ancestor.parentId ? flat.find(node => node.id === ancestor!.parentId) || null : null;
    }
    const existing = flat.find(node => node.id === item.id);
    if (existing?.children.length && existing.parentId !== parentId) return reply({ error: 'Move child categories first before changing this parent.' }, 409);
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
      depth: parent ? parent.depth + 1 : 0,
    }, [...actorGuard(user), await audit(user, 'content.category_saved', item.id || item.name, 'Category saved')]);

    return reply({ ok: true, categories: next });
  } catch (error) {
    return fail(error);
  }
}
