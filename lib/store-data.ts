import { env } from 'cloudflare:workers';
import { products as seed, adminDemoProducts, Product, ProductVariant } from '@/app/catalog';
export type { ProductVariant };
import { buildDefaultCategoryTree, type CategoryNode } from '@/lib/categories';
import { categoryAvailability, visibleCategoryTree } from '@/lib/category-availability';
export { buildDefaultCategoryTree, categorySeed, defaultCategories, topLevelCategoryNames, type CategoryNode } from '@/lib/categories';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'category';
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
      auto_disabled INTEGER NOT NULL DEFAULT 0,
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
    await db.prepare(`ALTER TABLE category_nodes ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0`).run().catch(() => {});
    await db.prepare(`ALTER TABLE category_nodes ADD COLUMN auto_disabled INTEGER NOT NULL DEFAULT 0`).run().catch(() => {});
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_category_nodes_parent ON category_nodes(parent_id, display_order, name)`).run();
    return db;
  } catch {
    return null;
  }
}

async function readCategoryTree(): Promise<CategoryNode[]> {
  const fallback = buildDefaultCategoryTree();
  const db = await ensureCategoryTables();
  if (!db) return fallback;

  try {
    const rows = await db.prepare('SELECT id, parent_id, name, slug, image, enabled, auto_disabled, display_order, description, meta_title, meta_keywords, meta_description, depth, deleted FROM category_nodes ORDER BY depth ASC, display_order ASC, name ASC').all<{ id: string; parent_id: string | null; name: string; slug: string; image: string; enabled: number; auto_disabled: number; display_order: number; description: string; meta_title: string; meta_keywords: string; meta_description: string; depth: number; deleted: number }>();
    const deletedIds = new Set(rows.results.filter(row => row.deleted).map(row => row.id));
    const custom = (rows.results || []).map((row) => ({
      id: row.id,
      parentId: row.parent_id,
      name: row.name,
      slug: row.slug,
      image: row.image,
      enabled: Boolean(row.enabled),
      autoDisabled: Boolean(row.auto_disabled),
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
    const mapped = Array.from(byId.values()).filter(node => !deletedIds.has(node.id));
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

export async function categoryTree(catalogProducts?: Promise<ManagedProduct[]>): Promise<CategoryNode[]> {
  const [tree, products] = await Promise.all([readCategoryTree(), catalogProducts ?? catalog(true)]);
  return visibleCategoryTree(tree, categoryAvailability(tree, products));
}

export async function categoryTreeForAdmins(): Promise<CategoryNode[]> {
  return readCategoryTree();
}

export async function syncCategoryAvailability(): Promise<CategoryNode[]> {
  const db = await ensureCategoryTables();
  if (!db) throw new Error('Category database is unavailable.');
  await db.prepare('UPDATE category_nodes SET enabled=1,auto_disabled=0 WHERE auto_disabled=1').run();
  return readCategoryTree();
}

export async function updateCategoryTree(item: Partial<CategoryNode> & { id: string; name: string; slug?: string; parentId?: string | null; enabled?: boolean; description?: string; displayOrder?: number; depth?: number; image?: string; metaTitle?: string; metaKeywords?: string; metaDescription?: string }, guards: D1PreparedStatement[] = []) {
  const db = await ensureCategoryTables();
  if (!db) throw new Error('Category database is unavailable.');

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

  const statement = db.prepare('INSERT INTO category_nodes (id, parent_id, name, slug, image, enabled, auto_disabled, display_order, description, meta_title, meta_keywords, meta_description, depth) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, name = excluded.name, slug = excluded.slug, image = excluded.image, enabled = excluded.enabled, auto_disabled=0, display_order = excluded.display_order, description = excluded.description, meta_title = excluded.meta_title, meta_keywords = excluded.meta_keywords, meta_description = excluded.meta_description, depth = excluded.depth').bind(payload.id, payload.parentId, payload.name, payload.slug, payload.image, payload.enabled ? 1 : 0, payload.displayOrder, payload.description, payload.metaTitle, payload.metaKeywords, payload.metaDescription, payload.depth);
  await db.batch([...guards, statement]);
  return syncCategoryAvailability();
}

export async function ensureInventoryTables() {
  const db = database();
  if (!db) return null;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS inventory_logs (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      variant_id TEXT,
      sku TEXT,
      previous_stock INTEGER NOT NULL,
      change INTEGER NOT NULL,
      new_stock INTEGER NOT NULL,
      reason TEXT NOT NULL,
      order_id TEXT,
      actor_id TEXT,
      actor_name TEXT,
      created_at TEXT NOT NULL
    )`).run();
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id, created_at)`).run().catch(() => {});
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_inventory_logs_order ON inventory_logs(order_id)`).run().catch(() => {});
    return db;
  } catch {
    return null;
  }
}

export type InventoryLog = {
  id: string; product_id: string; variant_id: string | null; sku: string | null;
  previous_stock: number; change: number; new_stock: number; reason: string;
  order_id: string | null; actor_id: string | null; actor_name: string | null; created_at: string;
};

export async function getInventoryLogs(productId?: string, limit = 100, variantId?: string) {
  const db = await ensureInventoryTables();
  if (!db) throw new Error('Inventory database is unavailable.');
  try {
    const stmt = productId && variantId
      ? db.prepare('SELECT * FROM inventory_logs WHERE product_id=? AND variant_id=? ORDER BY created_at DESC LIMIT ?').bind(productId, variantId, limit)
      : productId
      ? db.prepare('SELECT id, product_id, variant_id, sku, previous_stock, change, new_stock, reason, order_id, actor_id, actor_name, created_at FROM inventory_logs WHERE product_id = ? ORDER BY created_at DESC LIMIT ?').bind(productId, limit)
      : db.prepare('SELECT id, product_id, variant_id, sku, previous_stock, change, new_stock, reason, order_id, actor_id, actor_name, created_at FROM inventory_logs ORDER BY created_at DESC LIMIT ?').bind(limit);
    const rows = await stmt.all<InventoryLog>();
    return rows.results || [];
  } catch (error) {
    throw error;
  }
}

import type { ReturnRequest } from '@/lib/return-types';

export const defaultSeedReturns: ReturnRequest[] = [
  {
    id: "RET-1001",
    orderId: "ZPK-1004",
    customerName: "Ayesha Malik",
    customerPhone: "0300-1234567",
    customerAddress: "House 42-B, Street 7, F-10/2",
    customerCity: "Islamabad",
    orderDate: new Date(Date.now() - 7 * 86400000).toISOString(),
    deliveryDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    requestedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    returnStatus: "Requested",
    refundStatus: "Pending",
    inspectionStatus: "Pending Inspection",
    inventoryAction: "Pending",
    items: [
      {
        id: "fashion-sneakers-black",
        variantId: "fashion-sneakers-black-39",
        name: "Fashion-Forward Breathable Sneakers with Arch Support",
        sku: "SNK-BLK-39",
        color: "Black",
        size: "39",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80",
        orderedQty: 2,
        returnQty: 1,
        unitPrice: 2999,
        totalPrice: 2999,
      },
    ],
    totalRefundableAmount: 2999,
    approvedRefundAmount: 2999,
    returnReason: "Wrong Size / Fit Issue",
    customerComments: "Size 39 is slightly too tight for me. Requesting return and refund.",
    evidenceImages: [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80"
    ],
    timeline: [
      {
        id: "tl-1",
        step: "Requested",
        title: "Return Requested by Customer",
        description: "Customer requested return for 1x Size 39 (Wrong Size / Fit Issue)",
        actor: "Ayesha Malik (Customer)",
        actorRole: "Customer",
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "RET-1002",
    orderId: "ZPK-1002",
    customerName: "Zainab Tariq",
    customerPhone: "0321-9876543",
    customerAddress: "Flat 4B, Al-Noor Heights, Gulberg III",
    customerCity: "Lahore",
    orderDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    deliveryDate: new Date(Date.now() - 6 * 86400000).toISOString(),
    requestedDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    returnStatus: "Received",
    refundStatus: "Pending",
    inspectionStatus: "Good Condition",
    inventoryAction: "Pending",
    items: [
      {
        id: "fashion-sneakers-grey",
        variantId: "fashion-sneakers-grey-38",
        name: "Fashion-Forward Breathable Sneakers with Arch Support",
        sku: "SNK-GRY-38",
        color: "Grey Pink",
        size: "38",
        image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=700&auto=format&fit=crop&q=80",
        orderedQty: 1,
        returnQty: 1,
        unitPrice: 2999,
        totalPrice: 2999,
      },
    ],
    totalRefundableAmount: 2999,
    approvedRefundAmount: 2999,
    returnReason: "Color Mismatch",
    customerComments: "Color is lighter than expected.",
    evidenceImages: [],
    internalNotes: "Parcel received at Lahore warehouse. Inspected in original box, tags intact.",
    timeline: [
      {
        id: "tl-201",
        step: "Requested",
        title: "Return Requested",
        description: "Customer requested return for 1x Grey Pink Size 38",
        actor: "Zainab Tariq",
        actorRole: "Customer",
        timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
      {
        id: "tl-202",
        step: "Approved",
        title: "Return Approved",
        description: "Approved for return pickup via Trax Logistics",
        actor: "Admin",
        actorRole: "CSR",
        timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: "tl-203",
        step: "In Transit",
        title: "Reverse Pickup Booked",
        description: "Consignment TRX-RET-9821 picked up from customer",
        actor: "Trax Logistics",
        actorRole: "Courier",
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: "tl-204",
        step: "Received",
        title: "Received at Warehouse",
        description: "Package received and verified by warehouse team",
        actor: "Warehouse Staff",
        actorRole: "Inventory",
        timestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
      },
      {
        id: "tl-205",
        step: "Inspected",
        title: "Inspection Completed: Good Condition",
        description: "Original box and tags intact. Eligible for restocking and full refund.",
        actor: "Quality Team",
        actorRole: "Inspection",
        timestamp: new Date(Date.now() - 12 * 3600000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  },
  {
    id: "RET-1003",
    orderId: "ZPK-1001",
    customerName: "Muhammad Bilal",
    customerPhone: "0345-5551234",
    customerAddress: "House 12, Street 3, DHA Phase 5",
    customerCity: "Karachi",
    orderDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    deliveryDate: new Date(Date.now() - 10 * 86400000).toISOString(),
    requestedDate: new Date(Date.now() - 9 * 86400000).toISOString(),
    returnStatus: "Refunded",
    refundStatus: "Refunded",
    inspectionStatus: "Good Condition",
    inventoryAction: "Restocked",
    items: [
      {
        id: "fashion-sneakers-black",
        variantId: "fashion-sneakers-black-40",
        name: "Fashion-Forward Breathable Sneakers with Arch Support",
        sku: "SNK-BLK-40",
        color: "Black",
        size: "40",
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&auto=format&fit=crop&q=80",
        orderedQty: 1,
        returnQty: 1,
        unitPrice: 2999,
        totalPrice: 2999,
        restocked: true,
        restockedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        restockedBy: "Admin",
      },
    ],
    totalRefundableAmount: 2999,
    approvedRefundAmount: 2999,
    returnReason: "Wrong Size / Fit Issue",
    customerComments: "Too small, needed exchange/refund.",
    evidenceImages: [],
    refundMethod: "JazzCash",
    refundAccountTitle: "Muhammad Bilal",
    refundAccountNumber: "03455551234",
    refundReference: "JC-99881122",
    refundedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    refundedBy: "Admin",
    timeline: [
      {
        id: "tl-301",
        step: "Requested",
        title: "Return Requested",
        actor: "Muhammad Bilal",
        timestamp: new Date(Date.now() - 9 * 86400000).toISOString(),
      },
      {
        id: "tl-302",
        step: "Approved",
        title: "Approved",
        actor: "Admin",
        timestamp: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: "tl-303",
        step: "Received",
        title: "Received at Warehouse",
        actor: "Warehouse",
        timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
      },
      {
        id: "tl-304",
        step: "Restocked",
        title: "Restocked into Inventory (+1 Black / 40)",
        actor: "Admin",
        timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: "tl-305",
        step: "Refunded",
        title: "Refund Completed (Rs. 2,999 via JazzCash)",
        description: "Tx Ref: JC-99881122 to 03455551234",
        actor: "Admin",
        timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

export async function ensureReturnTables() {
  const db = database();
  if (!db) return null;
  try {
    await db.prepare(`CREATE TABLE IF NOT EXISTS return_requests (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_alt_phone TEXT,
      customer_address TEXT,
      customer_city TEXT,
      order_date TEXT,
      delivery_date TEXT,
      requested_date TEXT,
      return_status TEXT NOT NULL,
      refund_status TEXT NOT NULL,
      inspection_status TEXT NOT NULL,
      inventory_action TEXT NOT NULL,
      items TEXT NOT NULL,
      total_refundable_amount INTEGER NOT NULL,
      approved_refund_amount INTEGER NOT NULL DEFAULT 0,
      return_reason TEXT NOT NULL,
      customer_comments TEXT,
      evidence_images TEXT,
      rejection_reason TEXT,
      internal_notes TEXT,
      refund_method TEXT,
      refund_account_title TEXT,
      refund_account_number TEXT,
      refund_bank_name TEXT,
      refund_reference TEXT,
      refunded_at TEXT,
      refunded_by TEXT,
      courier TEXT,
      tracking_number TEXT,
      timeline TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`).run();
    const returnRequestColumns = [
      ['customer_alt_phone', 'TEXT'],
      ['customer_address', 'TEXT'],
      ['customer_city', 'TEXT'],
      ['order_date', 'TEXT'],
      ['delivery_date', 'TEXT'],
      ['requested_date', 'TEXT'],
    ] as const;
    for (const [column, type] of returnRequestColumns) {
      await db.prepare(`ALTER TABLE return_requests ADD COLUMN ${column} ${type}`).run().catch(() => {});
    }
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_return_requests_order ON return_requests(order_id)`).run().catch(() => {});
    await db.prepare(`CREATE INDEX IF NOT EXISTS idx_return_requests_status ON return_requests(return_status, created_at)`).run().catch(() => {});
    return db;
  } catch {
    return null;
  }
}

export async function getReturnRequests(limit = 1000): Promise<ReturnRequest[]> {
  const db = await ensureReturnTables();
  if (!db) throw new Error('Return database is unavailable.');
  try {
    const rows = await db.prepare(
      'SELECT id, order_id, customer_name, customer_phone, customer_alt_phone, customer_address, customer_city, order_date, delivery_date, requested_date, return_status, refund_status, inspection_status, inventory_action, items, total_refundable_amount, approved_refund_amount, return_reason, customer_comments, evidence_images, rejection_reason, internal_notes, refund_method, refund_account_title, refund_account_number, refund_bank_name, refund_reference, refunded_at, refunded_by, courier, tracking_number, timeline, created_at, updated_at FROM return_requests ORDER BY created_at DESC LIMIT ?'
    ).bind(limit).all<any>();

    return (rows.results || []).map((row: any) => ({
      id: row.id,
      orderId: row.order_id,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      customerAltPhone: row.customer_alt_phone || undefined,
      customerAddress: row.customer_address || undefined,
      customerCity: row.customer_city || undefined,
      orderDate: row.order_date || row.created_at,
      deliveryDate: row.delivery_date || undefined,
      requestedDate: row.requested_date || row.created_at,
      returnStatus: row.return_status,
      refundStatus: row.refund_status,
      inspectionStatus: row.inspection_status,
      inventoryAction: row.inventory_action,
      items: JSON.parse(row.items || '[]'),
      totalRefundableAmount: Number(row.total_refundable_amount || 0),
      approvedRefundAmount: Number(row.approved_refund_amount || 0),
      returnReason: row.return_reason,
      customerComments: row.customer_comments || undefined,
      evidenceImages: JSON.parse(row.evidence_images || '[]'),
      rejectionReason: row.rejection_reason || undefined,
      internalNotes: row.internal_notes || undefined,
      refundMethod: row.refund_method || undefined,
      refundAccountTitle: row.refund_account_title || undefined,
      refundAccountNumber: row.refund_account_number || undefined,
      refundBankName: row.refund_bank_name || undefined,
      refundReference: row.refund_reference || undefined,
      refundedAt: row.refunded_at || undefined,
      refundedBy: row.refunded_by || undefined,
      courier: row.courier || undefined,
      trackingNumber: row.tracking_number || undefined,
      timeline: JSON.parse(row.timeline || '[]'),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    throw error;
  }
}

export async function saveReturnRequest(ret: ReturnRequest) {
  const db = await ensureReturnTables();
  if (!db) throw new Error('Return database is unavailable.');
  await returnRequestStatement(ret).run();
  return true;
}

export function returnRequestStatement(ret: ReturnRequest) {
  return database().prepare(`
      INSERT INTO return_requests (
        id, order_id, customer_name, customer_phone, customer_alt_phone, customer_address, customer_city,
        order_date, delivery_date, requested_date, return_status, refund_status,
        inspection_status, inventory_action, items, total_refundable_amount,
        approved_refund_amount, return_reason, customer_comments, evidence_images,
        rejection_reason, internal_notes, refund_method, refund_account_title,
        refund_account_number, refund_bank_name, refund_reference, refunded_at,
        refunded_by, courier, tracking_number, timeline, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        order_id = excluded.order_id,
        customer_name = excluded.customer_name,
        customer_phone = excluded.customer_phone,
        customer_alt_phone = excluded.customer_alt_phone,
        customer_address = excluded.customer_address,
        customer_city = excluded.customer_city,
        order_date = excluded.order_date,
        delivery_date = excluded.delivery_date,
        requested_date = excluded.requested_date,
        return_status = excluded.return_status,
        refund_status = excluded.refund_status,
        inspection_status = excluded.inspection_status,
        inventory_action = excluded.inventory_action,
        items = excluded.items,
        total_refundable_amount = excluded.total_refundable_amount,
        approved_refund_amount = excluded.approved_refund_amount,
        return_reason = excluded.return_reason,
        customer_comments = excluded.customer_comments,
        evidence_images = excluded.evidence_images,
        rejection_reason = excluded.rejection_reason,
        internal_notes = excluded.internal_notes,
        refund_method = excluded.refund_method,
        refund_account_title = excluded.refund_account_title,
        refund_account_number = excluded.refund_account_number,
        refund_bank_name = excluded.refund_bank_name,
        refund_reference = excluded.refund_reference,
        refunded_at = excluded.refunded_at,
        refunded_by = excluded.refunded_by,
        courier = excluded.courier,
        tracking_number = excluded.tracking_number,
        timeline = excluded.timeline,
        updated_at = excluded.updated_at
    `).bind(
      ret.id,
      ret.orderId,
      ret.customerName,
      ret.customerPhone,
      ret.customerAltPhone || '',
      ret.customerAddress || '',
      ret.customerCity || '',
      ret.orderDate || ret.createdAt,
      ret.deliveryDate || '',
      ret.requestedDate || ret.createdAt,
      ret.returnStatus,
      ret.refundStatus,
      ret.inspectionStatus,
      ret.inventoryAction,
      JSON.stringify(ret.items || []),
      ret.totalRefundableAmount,
      ret.approvedRefundAmount,
      ret.returnReason,
      ret.customerComments || '',
      JSON.stringify(ret.evidenceImages || []),
      ret.rejectionReason || '',
      ret.internalNotes || '',
      ret.refundMethod || '',
      ret.refundAccountTitle || '',
      ret.refundAccountNumber || '',
      ret.refundBankName || '',
      ret.refundReference || '',
      ret.refundedAt || '',
      ret.refundedBy || '',
      ret.courier || '',
      ret.trackingNumber || '',
      JSON.stringify(ret.timeline || []),
      ret.createdAt,
      ret.updatedAt || new Date().toISOString()
    );
}

export type ManagedProduct = Product & {
  status: 'Active' | 'Draft';
  listingGroup?: string;
  sku?: string;
  color?: string;
  colorHex?: string;
  size?: string;
  stock?: number;
  sizeStock?: Record<string, number>;
  bundlePricing?: any;
  customOptions?: any;
  childCategory?: string;
  [key: string]: any;
};

export type BannerSlide = {
  id: string;
  image: string;
  link?: string;
  alt?: string;
};

export type Coupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  minSpend?: number;
  status: "Active" | "Inactive";
  usageCount?: number;
  expiryDate?: string;
};

export type StoreOffer = {
  id: string;
  title: string;
  tagline: string;
  discountType: "percentage" | "fixed" | "bundle";
  discountValue: number;
  minQuantity?: number;
  badgeText?: string;
  enabled: boolean;
  status?: "Draft" | "Scheduled" | "Active" | "Paused" | "Expired";
  startAt?: string;
  endAt?: string;
  maxDiscount?: number;
  priority?: number;
  stackable?: boolean;
  eligibleProductIds?: string[];
  eligibleCategories?: string[];
  usageLimit?: number;
  perCustomerLimit?: number;
};

export type InformationPage = {
  id: string;
  title: string;
  slug: string;
  content: string;
  enabled: boolean;
  updatedAt?: string;
};

export type Settings = {
  deliveryCharge: number;
  freeThreshold: number;
  supportEmail: string;
  whatsapp: string;
  logo?: string;
  logoText?: string;
  lightningDealProductIds?: string[];
  clearanceDealProductIds?: string[];
  // Banner & Carousel fields
  banners?: BannerSlide[];
  bannerAutoplay?: boolean;
  bannerInterval?: number;
  bannerImage?: string;
  bannerLink?: string;
  // Offers, Coupons & Info Pages
  coupons?: Coupon[];
  offers?: StoreOffer[];
  infoPages?: InformationPage[];
  // Banner management fields
  announcementText?: string;
  announcementHighlight?: string;
  announcementEnabled?: boolean;
  heroKicker?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  heroButtonText?: string;
  heroButtonLink?: string;
  heroSecondaryButtonText?: string;
  heroSecondaryButtonLink?: string;
  heroTrustRating?: string;
  promoBanner1Kicker?: string;
  promoBanner1Title?: string;
  promoBanner1ButtonText?: string;
  promoBanner1Link?: string;
  promoBanner1ButtonLink?: string;
  promoBanner1Image?: string;
  promoBanner1Enabled?: boolean;
  promoBanner2Kicker?: string;
  promoBanner2Title?: string;
  promoBanner2ButtonText?: string;
  promoBanner2Link?: string;
  promoBanner2ButtonLink?: string;
  promoBanner2Image?: string;
  promoBanner2Enabled?: boolean;
  themePrimaryColor?: string;
  themeAccentColor?: string;
  themeBackgroundColor?: string;
  themeTextColor?: string;
  themeFontFamily?: string;
  themeButtonRadius?: string;
  themeCardRadius?: string;
};

export const defaults: Settings = {
  deliveryCharge: 250,
  freeThreshold: 5000,
  supportEmail: '',
  whatsapp: '',
  logo: '',
  logoText: '',
  banners: [],
  bannerAutoplay: true,
  bannerInterval: 5,
  bannerImage: '',
  bannerLink: '/products',
  coupons: [
    { id: "c-1", code: "WELCOME10", type: "percentage", value: 10, minSpend: 1500, status: "Active", usageCount: 24 },
    { id: "c-2", code: "FREESHIP", type: "fixed", value: 250, minSpend: 3000, status: "Active", usageCount: 58 },
    { id: "c-3", code: "SAVE500", type: "fixed", value: 500, minSpend: 5000, status: "Active", usageCount: 12 },
  ],
  offers: [
    { id: "off-1", title: "Bundle Discount: Buy Any 2 Items", tagline: "Save 10% automatically at checkout", discountType: "percentage", discountValue: 10, minQuantity: 2, badgeText: "POPULAR", enabled: true },
    { id: "off-2", title: "Mega Saver: Buy Any 3+ Items", tagline: "Save 15% automatically at checkout", discountType: "percentage", discountValue: 15, minQuantity: 3, badgeText: "BEST VALUE", enabled: true },
  ],
  infoPages: [
    { id: "about", title: "About Cartify Pakistan", slug: "about-us", content: "Cartify is Pakistan's premier destination for curated fashion, footwear, bags, and everyday essentials with guaranteed Cash on Delivery across 200+ cities.", enabled: true },
    { id: "shipping", title: "Shipping & Delivery Policy", slug: "shipping-policy", content: "We ship all orders across Pakistan via Trax Logistics, TCS, and Leopards Express. Standard delivery takes 2-4 working days.", enabled: true },
    { id: "returns", title: "7-Day Easy Returns & Exchange", slug: "return-policy", content: "If you receive a damaged or incorrect item, or if the size doesn't fit, you can request an exchange or return within 7 days of delivery.", enabled: true },
    { id: "privacy", title: "Privacy Policy", slug: "privacy-policy", content: "Your personal details and contact numbers are strictly confidential and only used for order dispatch and courier tracking updates.", enabled: true },
    { id: "terms", title: "Terms & Conditions", slug: "terms", content: "By placing an order on Cartify Pakistan, you agree to inspect packages upon arrival and provide accurate shipping address details for Cash on Delivery dispatch.", enabled: true },
  ],
  announcementText: 'Thoughtful finds. Delivered across Pakistan with Cash on Delivery.',
  announcementHighlight: 'Free delivery on orders from Rs 5,000',
  announcementEnabled: true,
  heroKicker: 'NATIONWIDE CASH ON DELIVERY • 3-DAY SHIPPING',
  heroTitle: 'Everyday essentials.\nAnything but ordinary.',
  heroSubtitle: 'Fresh finds for your home, style, and everyday comfort. Shop in Pakistani Rupees with verified quality and safe doorstep delivery across Pakistan.',
  heroImage: '',
  heroButtonText: 'Explore Collection',
  heroButtonLink: '/products',
  heroSecondaryButtonText: "Today's Deals",
  heroSecondaryButtonLink: '/products',
  heroTrustRating: '4.9/5 Rating • 10,000+ Happy Customers',
  promoBanner1Kicker: 'A MOMENT FOR YOU',
  promoBanner1Title: 'A little care.\nAn everyday ritual.',
  promoBanner1ButtonText: 'Discover beauty',
  promoBanner1Link: '/products?category=Beauty%20%26%20Care',
  promoBanner1Image: '/images/beauty.jpg',
  promoBanner1Enabled: true,
  promoBanner2Kicker: 'THE FINISHING TOUCH',
  promoBanner2Title: 'Take your style\neverywhere.',
  promoBanner2ButtonText: 'Explore accessories',
  promoBanner2Link: '/products?category=Accessories',
  promoBanner2Image: '/images/bag.jpg',
  promoBanner2Enabled: true,
  themePrimaryColor: '#203664',
  themeAccentColor: '#ff5000',
  themeBackgroundColor: '#ffffff',
  themeTextColor: '#1e293b',
  themeFontFamily: 'Inter, Arial, sans-serif',
  themeButtonRadius: '12px',
  themeCardRadius: '16px',
};
export function database(){return env.DB ?? null;}
export async function catalog(all=false):Promise<ManagedProduct[]>{
  const baseSeed = all ? [...seed, ...adminDemoProducts] : seed;
  const merged=new Map<string,ManagedProduct>(baseSeed.map(p=>[p.id,{...p,status:p.status || 'Active'}]));
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
