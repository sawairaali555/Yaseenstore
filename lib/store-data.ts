import { env } from 'cloudflare:workers';
import { products as seed, Product } from '@/app/catalog';

export type CategoryNode = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  image: string;
  enabled: boolean;
  displayOrder: number;
  description: string;
  metaTitle?: string;
  metaKeywords?: string;
  metaDescription?: string;
  depth: number;
  children: CategoryNode[];
};

export const defaultCategories = ['Fashion', 'Beauty & Care', 'Home & Kitchen', 'Electronics', 'Accessories'] as const;
export const categorySeed: Record<string, string[]> = {
  Fashion: ['Shoes', 'Clothing', 'Traditional wear'],
  'Beauty & Care': ['Skincare', 'Haircare', 'Beauty tools'],
  'Home & Kitchen': ['Cookware', 'Storage', 'Home essentials'],
  Electronics: ['Audio', 'Wearables', 'Mobile accessories'],
  Accessories: ['Bags', 'Watches', 'Everyday accessories'],
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
}

export function buildDefaultCategoryTree(): CategoryNode[] {
  return defaultCategories.map((name, index) => {
    const parentId = slugify(name);
    return {
      id: parentId,
      parentId: null,
      name,
      slug: parentId,
      image: '',
      enabled: true,
      displayOrder: index,
      description: '',
      depth: 0,
      children: (categorySeed[name] || []).map((child, childIndex) => ({
        id: `${parentId}-${slugify(child)}`,
        parentId,
        name: child,
        slug: slugify(child),
        image: '',
        enabled: true,
        displayOrder: childIndex,
        description: '',
        depth: 1,
        children: [],
      })),
    };
  });
}

export function topLevelCategoryNames(tree: CategoryNode[] = []): string[] {
  return tree.filter((node) => node.enabled).map((node) => node.name);
}

export function flattenCategoryNames(tree: CategoryNode[] = []): string[] {
  const names = new Set<string>();
  const walk = (nodes: CategoryNode[]) => {
    for (const node of nodes) {
      if (node.enabled) names.add(node.name);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(tree);
  return Array.from(names);
}

export async function ensureCategoryTables() {
  const db = database();
  if (!db) return null;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS category_nodes (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      image TEXT DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0,
      description TEXT NOT NULL DEFAULT '',
      meta_title TEXT NOT NULL DEFAULT '',
      meta_keywords TEXT NOT NULL DEFAULT '',
      meta_description TEXT NOT NULL DEFAULT '',
      depth INTEGER NOT NULL DEFAULT 0
    )`).run();
    await db.prepare(`ALTER TABLE category_nodes ADD COLUMN meta_title TEXT NOT NULL DEFAULT ''`).run().catch(() => {});
    await db.prepare(`ALTER TABLE category_nodes ADD COLUMN meta_keywords TEXT NOT NULL DEFAULT ''`).run().catch(() => {});
    await db.prepare(`ALTER TABLE category_nodes ADD COLUMN meta_description TEXT NOT NULL DEFAULT ''`).run().catch(() => {});
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_category_nodes_parent ON category_nodes(parent_id, display_order, name)`).run();
    return db;
  } catch {
    return null;
  }
}

export async function categoryTree(): Promise<CategoryNode[]> {
  const fallback = buildDefaultCategoryTree();
  const db = await ensureCategoryTables();
  if (!db) return fallback;

  try {
    const rows = await db.prepare('SELECT id, parent_id, name, slug, image, enabled, display_order, description, meta_title, meta_keywords, meta_description, depth FROM category_nodes ORDER BY depth ASC, display_order ASC, name ASC').all<{ id: string; parent_id: string | null; name: string; slug: string; image: string; enabled: number; display_order: number; description: string; meta_title: string; meta_keywords: string; meta_description: string; depth: number }>();
    const custom = (rows.results || []).map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      slug: row.slug,
      image: row.image,
      enabled: Boolean(row.enabled),
      displayOrder: row.display_order,
      description: row.description,
      metaTitle: row.meta_title,
      metaKeywords: row.meta_keywords,
      metaDescription: row.meta_description,
      depth: row.depth,
      children: [],
    }));

    if (!custom.length) return fallback;

    const byId = new Map<string, CategoryNode>();
    const seed = (nodes: CategoryNode[]) => {
      for (const node of nodes) {
        byId.set(node.id, { ...node, children: [] });
        if (node.children?.length) seed(node.children);
      }
    };
    seed(fallback);
    for (const node of custom) byId.set(node.id, { ...node, children: [] });
    const mapped = Array.from(byId.values());
    const map = new Map<string, CategoryNode>();
    for (const node of mapped) map.set(node.id, node);
    const roots: CategoryNode[] = [];
    for (const node of mapped) {
      if (!node.parentId) roots.push(node);
      else {
        const parent = map.get(node.parentId);
        if (parent) parent.children.push(node);
      }
    }
    return roots.sort((a, b) => a.displayOrder - b.displayOrder);
  } catch {
    return fallback;
  }
}

export async function categoryTreeForAdmins(): Promise<CategoryNode[]> {
  return categoryTree();
}

export async function updateCategoryTree(item: Partial<CategoryNode> & { id: string; name: string; slug?: string; parentId?: string | null; enabled?: boolean; description?: string; displayOrder?: number; depth?: number; image?: string; metaTitle?: string; metaKeywords?: string; metaDescription?: string }) {
  const db = await ensureCategoryTables();
  if (!db) return buildDefaultCategoryTree();

  const payload = {
    id: item.id,
    parentId: item.parentId ?? null,
    name: item.name,
    slug: item.slug || slugify(item.name),
    image: item.image || '',
    enabled: item.enabled ?? true,
    displayOrder: item.displayOrder ?? 0,
    description: item.description || '',
    metaTitle: item.metaTitle || '',
    metaKeywords: item.metaKeywords || '',
    metaDescription: item.metaDescription || '',
    depth: item.depth ?? (item.parentId ? 1 : 0),
  };

  await db.prepare('INSERT INTO category_nodes (id, parent_id, name, slug, image, enabled, display_order, description, meta_title, meta_keywords, meta_description, depth) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, name = excluded.name, slug = excluded.slug, image = excluded.image, enabled = excluded.enabled, display_order = excluded.display_order, description = excluded.description, meta_title = excluded.meta_title, meta_keywords = excluded.meta_keywords, meta_description = excluded.meta_description, depth = excluded.depth').bind(payload.id, payload.parentId, payload.name, payload.slug, payload.image, payload.enabled ? 1 : 0, payload.displayOrder, payload.description, payload.metaTitle, payload.metaKeywords, payload.metaDescription, payload.depth).run();
  return categoryTree();
}

export type ManagedProduct = Product & { status: 'Active' | 'Draft'; stock?: number; sizeStock?: Record<string, number>; listingGroup?: string; sku?: string; color?: string; option?: string; sizes?: string[] };
export type Settings={deliveryCharge:number;freeThreshold:number;supportEmail:string;whatsapp:string;logo?:string;logoText?:string};
export const defaults:Settings={deliveryCharge:250,freeThreshold:5000,supportEmail:'',whatsapp:'',logo:'',logoText:''};
export function database(){return env.DB ?? null;}
export async function catalog(all=false):Promise<ManagedProduct[]>{
  const merged=new Map<string,ManagedProduct>(seed.map(p=>[p.id,{...p,status:'Active'}]));
  const db=database();
  if(!db){return [...merged.values()].filter(p=>all||p.status==='Active');}
  try{
    const rows=await db.prepare('SELECT id, data, status FROM catalog_records').all<{id:string;data:string;status:string}>();
    for(const row of rows.results){
      if(row.status==='Deleted'){
        merged.delete(row.id);
      }else{
        merged.set(row.id,{...JSON.parse(row.data),id:row.id,status:row.status as 'Active'|'Draft'});
      }
    }
    return [...merged.values()].filter(p=>all||p.status==='Active');
  }catch{
    return [...merged.values()].filter(p=>all||p.status==='Active');
  }
}
export async function settings():Promise<Settings>{
  const db=database();
  if(!db){return defaults;}
  try{
    const row=await db.prepare('SELECT data FROM store_settings WHERE id = ?').bind('store').first<{data:string}>();
    return {...defaults,...row?JSON.parse(row.data):{}};
  }catch{
    return defaults;
  }
}
export const deliveryFor=(total:number,s:Settings)=>total>=s.freeThreshold?0:s.deliveryCharge;
