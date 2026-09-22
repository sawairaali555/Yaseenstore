import { actor, actorGuard, audit, fail, origin, sql } from '@/lib/access/server';
import { has } from '@/lib/access/policy';
import {
  database,
  catalog,
  categoryTree,
  settings,
  ensureInventoryTables,
  getInventoryLogs,
  ensureReturnTables,
  getReturnRequests,
  saveReturnRequest,
} from '@/lib/store-data';
import type { ReturnRequest, ReturnItem, ReturnTimelineEntry } from '@/lib/return-types';
import { z } from 'zod';
import { categories } from '@/app/catalog';

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

const imageValue = z
  .string()
  .max(2000000)
  .refine(
    (s) =>
      ['headphones', 'bag', 'shoes', 'beauty', 'watch', 'kitchen'].includes(s) ||
      /^https?:\/\/[^\s]+$/.test(s) ||
      /^data:image\/[a-zA-Z]+;base64,/.test(s) ||
      /^\/images\//.test(s) ||
      /^\/api\/media\//.test(s)
  );

const seoSchema = z
  .object({
    title: z.string().max(160).optional(),
    titleUrdu: z.string().max(160).optional(),
    keywords: z.string().max(1000).optional(),
    keywordsUrdu: z.string().max(1000).optional(),
    description: z.string().max(320).optional(),
    descriptionUrdu: z.string().max(320).optional(),
    tags: z.string().max(500).optional(),
    tagsUrdu: z.string().max(500).optional(),
  })
  .optional();

const dealSchema = z
  .object({
    title: z.string().max(60).optional(),
    shippingBadge: z.string().max(80).optional(),
    creditBadge: z.string().max(80).optional(),
    productNote: z.string().max(220).optional(),
    deliveryNote: z.string().max(140).optional(),
    cta: z.string().max(80).optional(),
    trustShipping: z.string().max(120).optional(),
    trustPayment: z.string().max(120).optional(),
    trustGuarantee: z.string().max(120).optional(),
    chips: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  })
  .optional();

const reviewSchema = z.object({
  id: z.string().max(80),
  name: z.string().trim().min(2).max(80),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().min(5).max(1000),
  textArabic: z.string().max(1000).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  images: z.array(z.string().max(255)).max(10).optional(),
  date: z.string().max(40),
});

const bundleSchema = z.object({
  id: z.string().max(80),
  content: z.string().max(200),
  contentArabic: z.string().max(200),
  quantity: z.number().int().min(1).max(999),
  price: z.number().int().min(0).max(10000000),
});

const variantItemSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
  size: z.string().optional(),
  options: z.record(z.string(), z.string()).optional(),
  title: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.coerce.number().int().min(0).max(10000000).optional(),
  oldPrice: z.coerce.number().int().min(0).max(10000000).optional(),
  costPrice: z.coerce.number().int().min(0).max(10000000).optional(),
  stock: z.coerce.number().int().min(0).max(10000000).default(0),
  status: z.enum(['Active', 'Draft', 'Inactive']).optional(),
  image: z.string().optional(),
  images: z.array(z.string()).optional(),
});

const shippingSchema = z
  .object({
    weight: z.string().optional(),
    length: z.string().optional(),
    width: z.string().optional(),
    height: z.string().optional(),
    freeShipping: z.boolean().optional(),
  })
  .optional();

const storefrontSchema = z
  .object({
    featured: z.boolean().optional(),
    newArrival: z.boolean().optional(),
    bestSeller: z.boolean().optional(),
    showOnStorefront: z.boolean().optional(),
  })
  .optional();

const variantOptionTypeSchema = z.object({
  name: z.string(),
  values: z.array(z.string()),
});

const productSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]{1,100}$/),
    name: z.string().trim().min(2).max(150),
    category: z.string().trim().min(2).max(80),
    subcategory: z.string().trim().max(80).optional(),
    childCategory: z.string().trim().max(80).optional(),
    brand: z.string().trim().max(80).optional(),
    productType: z.string().trim().max(80).optional(),
    shortDescription: z.string().trim().max(1000).optional(),
    sku: z.string().trim().max(80).optional(),
    barcode: z.string().trim().max(80).optional(),
    color: z.string().trim().max(80).optional(),
    option: z.string().trim().max(80).optional(),
    catalogOwner: z.string().trim().max(120).optional(),
    listingGroup: z.string().regex(/^[a-z0-9-]{1,120}$/).optional(),
    stock: z.coerce.number().int().min(0).max(10000000).optional(),
    lowStockAlert: z.coerce.number().int().min(0).max(10000000).optional(),
    trackInventory: z.boolean().optional(),
    allowBackorders: z.boolean().optional(),
    hasVariants: z.boolean().optional(),
    variantOptions: z.array(variantOptionTypeSchema).optional(),
    variants: z.array(variantItemSchema).optional(),
    sizeStock: z.record(z.string().trim().min(1).max(30), z.coerce.number().int().min(0).max(10000000)).optional(),
    sizes: z.array(z.string().trim().min(1).max(30)).max(30).optional(),
    price: z.coerce.number().int().min(1).max(10000000),
    old: z.coerce.number().int().min(0).max(10000000),
    costPrice: z.coerce.number().int().min(0).max(10000000).optional(),
    pricingMode: z.enum(['group', 'option']).optional(),
    pricingType: z.enum(['offer', 'bundle']).optional(),
    bundles: z.array(bundleSchema).max(50).optional(),
    offerPrice: z.coerce.number().int().min(0).max(10000000).optional(),
    offerStart: z.string().max(20).optional(),
    offerEnd: z.string().max(20).optional(),
    shipping: shippingSchema,
    storefront: storefrontSchema,
    deal: dealSchema,
    image: imageValue,
    images: z.array(imageValue).max(50).optional(),
    tag: z.string().max(60).optional(),
    description: z.string().trim().max(10000).optional().default(''),
    features: z.array(z.string().trim().min(1).max(180)).max(20).optional(),
    seo: seoSchema,
    reviews: z.array(reviewSchema).max(100).optional(),
    status: z.enum(['Active', 'Draft']),
  })
  .refine((p) => !p.old || p.old >= p.price, { message: 'Compare-at price must be at least the selling price.' })
  .refine((p) => !p.offerPrice || p.offerPrice === 0 || p.offerPrice < p.price, { message: 'Offer price must be lower than the sale price.' })
  .refine((p) => !(p.offerStart && p.offerEnd) || p.offerStart <= p.offerEnd, { message: 'Offer end date cannot be before the start date.' });

const variantLinkSchema = z.object({
  ids: z.array(z.string().regex(/^[a-z0-9-]{1,100}$/)).min(2).max(50),
});

const settingSchema = z.object({
  deliveryCharge: z.number().int().min(0).max(100000),
  freeThreshold: z.number().int().min(0).max(10000000),
  supportEmail: z.union([z.literal(''), z.string().email().max(100)]),
  whatsapp: z.string().regex(/^(923\d{9})?$/),
  logo: z.string().max(2000000).optional(),
  logoText: z.string().max(80).optional(),
  // Banner & Carousel fields
  banners: z
    .array(
      z.object({
        id: z.string().max(100),
        image: z.string().max(5000000),
        link: z.string().max(500).optional(),
        alt: z.string().max(200).optional(),
      })
    )
    .max(20)
    .optional(),
  bannerAutoplay: z.boolean().optional(),
  bannerInterval: z.number().min(2).max(60).optional(),
  bannerImage: z.string().max(5000000).optional(),
  bannerLink: z.string().max(500).optional(),
  // Coupons, Offers & Information Pages
  coupons: z
    .array(
      z.object({
        id: z.string().max(100),
        code: z.string().max(50),
        type: z.enum(["percentage", "fixed"]),
        value: z.number().min(0),
        minSpend: z.number().min(0).optional(),
        status: z.enum(["Active", "Inactive"]),
        usageCount: z.number().min(0).optional(),
        expiryDate: z.string().max(50).optional(),
      })
    )
    .max(50)
    .optional(),
  offers: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(200),
        tagline: z.string().max(300),
        discountType: z.enum(["percentage", "fixed", "bundle"]),
        discountValue: z.number().min(0),
        minQuantity: z.number().min(1).optional(),
        badgeText: z.string().max(50).optional(),
        enabled: z.boolean(),
      })
    )
    .max(30)
    .optional(),
  infoPages: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().max(200),
        slug: z.string().max(100),
        content: z.string().max(50000),
        enabled: z.boolean(),
        updatedAt: z.string().max(50).optional(),
      })
    )
    .max(30)
    .optional(),
  // Banner management fields
  announcementText: z.string().max(300).optional(),
  announcementHighlight: z.string().max(200).optional(),
  announcementEnabled: z.boolean().optional(),
  heroKicker: z.string().max(150).optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(500).optional(),
  heroImage: z.string().max(2000000).optional(),
  heroButtonText: z.string().max(80).optional(),
  heroButtonLink: z.string().max(300).optional(),
  heroSecondaryButtonText: z.string().max(80).optional(),
  heroSecondaryButtonLink: z.string().max(300).optional(),
  heroTrustRating: z.string().max(100).optional(),
  promoBanner1Kicker: z.string().max(100).optional(),
  promoBanner1Title: z.string().max(200).optional(),
  promoBanner1ButtonText: z.string().max(80).optional(),
  promoBanner1Link: z.string().max(300).optional(),
  promoBanner1Image: z.string().max(2000000).optional(),
  promoBanner1Enabled: z.boolean().optional(),
  promoBanner2Kicker: z.string().max(100).optional(),
  promoBanner2Title: z.string().max(200).optional(),
  promoBanner2ButtonText: z.string().max(80).optional(),
  promoBanner2Link: z.string().max(300).optional(),
  promoBanner2Image: z.string().max(2000000).optional(),
  promoBanner2Enabled: z.boolean().optional(),
});

export async function GET() {
  try {
    const u = await actor('content.edit');
    await ensureInventoryTables();
    await ensureReturnTables();
    const [products, config, categoryData, rows, returnRequests] = await Promise.all([
      catalog(true),
      settings(),
      categoryTree(),
      has(u, 'orders.manage')
        ? database()
            .prepare('SELECT id, details, items, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 1000')
            .all()
        : Promise.resolve({ results: [] }),
      has(u, 'orders.manage') ? getReturnRequests(1000) : Promise.resolve([]),
    ]);
    return reply({
      products,
      settings: config,
      categories: categoryData,
      name: u.name,
      role: u.role,
      permissions: (await import('@/lib/access/policy')).ROLES[u.role].permissions,
      orders: rows.results.map((o: any) => ({
        ...o,
        details: JSON.parse(o.details || '{}'),
        items: JSON.parse(o.items || '[]'),
      })),
      returns: returnRequests,
    });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  try {
    origin(req);
    const u = await actor('content.edit');
    const raw = await req.text();
    if (raw.length > 3000000) return reply({ error: 'Request too large.' }, 413);
    const data = JSON.parse(raw);
    await ensureInventoryTables();

    // 1. Delete Product
    if (data.action === 'delete-product') {
      const id = z.string().regex(/^[a-z0-9-]{1,100}$/).parse(data.id);
      await database().batch([
        ...actorGuard(u),
        sql('INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status', id, '{}', 'Deleted'),
        await audit(u, 'content.product_deleted', id, 'Product deleted'),
      ]);
      return reply({ ok: true });
    }

    // 2. Save Product & Record Inventory Adjustments
    if (data.action === 'product') {
      const p = productSchema.parse(data.product);
      const current = await catalog(true);
      const existing = current.find((x) => x.id === p.id);

      if (current.some((x) => x.id === p.id && x.category !== p.category)) {
        return reply({ error: 'Category cannot be changed after creation because it determines product sizes.' }, 400);
      }
      if (p.sku && current.some((x) => x.id !== p.id && (x.sku || '').trim().toLowerCase() === p.sku!.trim().toLowerCase())) {
        return reply({ error: `SKU "${p.sku}" is already assigned to another product. Each product SKU must be unique.` }, 400);
      }

      const mergedProduct = { ...existing, ...p };
      const statements = [...actorGuard(u)];
      const nowIso = new Date().toISOString();

      // Track stock changes for audit logging
      if (Array.isArray(p.variants) && p.variants.length > 0) {
        for (const v of p.variants) {
          const oldV = existing?.variants?.find((x) => x.id === v.id);
          const oldStock = Number(oldV?.stock ?? 0);
          const newStock = Number(v.stock ?? 0);
          if (oldStock !== newStock) {
            statements.push(
              sql(
                'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                crypto.randomUUID(),
                p.id,
                v.id,
                v.sku || p.sku || p.id,
                oldStock,
                newStock - oldStock,
                newStock,
                existing ? 'Manual Adjustment' : 'Initial',
                null,
                u.id,
                u.name,
                nowIso
              )
            );
          }
        }
      } else {
        const oldStock = Number(existing?.stock ?? 0);
        const newStock = Number(p.stock ?? 0);
        if (oldStock !== newStock) {
          statements.push(
            sql(
              'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
              crypto.randomUUID(),
              p.id,
              null,
              p.sku || p.id,
              oldStock,
              newStock - oldStock,
              newStock,
              existing ? 'Manual Adjustment' : 'Initial',
              null,
              u.id,
              u.name,
              nowIso
            )
          );
        }
      }

      statements.push(
        sql(
          'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
          p.id,
          JSON.stringify(mergedProduct),
          p.status
        )
      );
      statements.push(await audit(u, 'content.product_saved', p.id, 'Product saved', { status: p.status, price: p.price }));

      await database().batch(statements);
      return reply({ ok: true });
    }

    // 3. Link Variants
    if (data.action === 'link-variants') {
      const input = variantLinkSchema.parse(data);
      const current = await catalog(true);
      const selected = current.filter((p) => input.ids.includes(p.id));
      if (selected.length !== new Set(input.ids).size) return reply({ error: 'One or more selected products were not found.' }, 404);
      const selectedGroups = new Set(selected.map((p) => p.listingGroup || p.id));
      const groupProducts = current.filter((p) => input.ids.includes(p.id) || selectedGroups.has(p.listingGroup || p.id));
      const group = Array.from(selectedGroups).sort()[0];
      const statements = [...actorGuard(u)];
      for (const product of groupProducts) {
        const linked = { ...product, listingGroup: group };
        statements.push(
          sql(
            'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
            linked.id,
            JSON.stringify(linked),
            linked.status
          )
        );
      }
      statements.push(await audit(u, 'content.product_variants_linked', group, 'Product colour variants linked', { ids: groupProducts.map((p) => p.id) }));
      await database().batch(statements);
      return reply({ ok: true, listingGroup: group, ids: groupProducts.map((p) => p.id) });
    }

    // 4. Save Settings
    if (data.action === 'settings') {
      await actor('settings.edit');
      const s = settingSchema.parse(data.settings);
      await database().batch([
        ...actorGuard(u),
        sql('INSERT INTO store_settings (id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data', 'store', JSON.stringify(s)),
        await audit(u, 'settings.updated', 'store', 'Store settings updated'),
      ]);
      return reply({ ok: true });
    }

    // 5. Delete Order & Cancellation Stock Restoration
    if (data.action === 'delete-order') {
      await actor('orders.manage');
      if (u.role !== 'super_admin' && !has(u, 'orders.delete')) {
        return reply({ error: 'Permanent order deletion is restricted to Super Admin. Please use Cancel Order.' }, 403);
      }
      const input = z
        .object({
          id: z.union([z.string().max(100), z.array(z.string().max(100)).max(500)]),
          reason: z.enum(['Test Order', 'Created by Mistake', 'Duplicate Record', 'Invalid / Fake Record', 'System Error', 'Other']).optional(),
          note: z.string().max(500).optional(),
        })
        .parse(data);
      const ids = Array.isArray(input.id) ? input.id : [input.id];
      const inFulfillmentStages = [
        'Picklist', 'Picking', 'Pack & AirwayBill', 'Packing', 'Packed', 'AWB Pending',
        'Ready to Ship', 'Shipped', 'Dispatched', 'In Transit', 'Out for Delivery', 'Delivered',
        'COD Settled', 'Failed Delivery', 'Delivery Failed', 'RTO', 'Returned to Origin',
        'Return Requested', 'Returned', 'Exchange Requested', 'Exchange Processing', 'Refund Pending', 'Refunded',
      ];
      const statements = [...actorGuard(u)];
      const currentProducts = await catalog(true);
      const nowIso = new Date().toISOString();

      for (const orderId of ids) {
        const existing = await sql('SELECT id, details, items, status FROM orders WHERE id=?', orderId).first<{
          id: string;
          details: string;
          items: string;
          status: string;
        }>();
        if (existing) {
          const details = JSON.parse(existing.details || '{}');
          const inFulfillment = inFulfillmentStages.includes(existing.status);
          const hasTracking = Boolean(details.trackingNumber);
          const hasPayment = Boolean(details.codSettled || details.codCollected || details.paymentStatus === 'Paid');
          const hasDispute = Boolean(details.returnStatus || details.refundStatus || details.exchangeStatus);
          if (inFulfillment || hasTracking || hasPayment || hasDispute) {
            return reply(
              {
                error: `Order #${orderId} cannot be deleted because it has active operational or financial history (${existing.status}${hasTracking ? ', AWB: ' + details.trackingNumber : ''}). Please use Cancel Order instead.`,
              },
              400
            );
          }
          if (!details.inventoryRestored && existing.status !== 'Cancelled') {
            const items = JSON.parse(existing.items || '[]');
            for (const item of items) {
              const prod = currentProducts.find((x) => x.id === item.id);
              if (prod) {
                const hasInternalVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
                const matchedVariant = hasInternalVariants
                  ? prod.variants!.find((v) =>
                      item.variantId
                        ? v.id === item.variantId
                        : (v.size || 'Standard') === item.size && (!item.color || (v.color || '').toLowerCase() === item.color.toLowerCase())
                    ) || prod.variants!.find((v) => (v.size || 'Standard') === item.size)
                  : null;

                const sizeStock = prod.sizeStock as Record<string, number> | undefined;
                const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
                let prevStock = 0;
                let newStock = 0;

                if (matchedVariant) {
                  prevStock = Number(matchedVariant.stock || 0);
                  newStock = prevStock + Number(item.qty || 0);
                  matchedVariant.stock = newStock;
                  prod.stock = prod.variants!.reduce((acc, v) => acc + Number(v.stock || 0), 0);
                } else if (hasSizeStock && item.size) {
                  prevStock = Number(sizeStock![item.size] || 0);
                  newStock = prevStock + Number(item.qty || 0);
                  sizeStock![item.size] = newStock;
                  prod.stock = Object.values(sizeStock!).reduce((acc, v) => acc + Number(v || 0), 0);
                } else {
                  prevStock = Number(prod.stock || 0);
                  newStock = prevStock + Number(item.qty || 0);
                  prod.stock = newStock;
                }

                statements.push(
                  sql(
                    'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
                    prod.id,
                    JSON.stringify(prod),
                    prod.status || 'Active'
                  )
                );

                statements.push(
                  sql(
                    'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                    crypto.randomUUID(),
                    prod.id,
                    matchedVariant?.id || null,
                    matchedVariant?.sku || prod.sku || prod.id,
                    prevStock,
                    Number(item.qty || 0),
                    newStock,
                    'Cancellation',
                    orderId,
                    u.id,
                    u.name,
                    nowIso
                  )
                );
              }
            }
          }
          statements.push(sql('DELETE FROM orders WHERE id=?', orderId));
          statements.push(
            await audit(u, 'order.deleted', orderId, `Order #${orderId} permanently deleted (${input.reason || 'Record removal'})`, {
              deletedOrderId: orderId,
              deletedByUserId: u.id,
              deletedByName: u.name,
              role: u.role,
              reason: input.reason || 'Record removal',
              note: input.note || '',
              deletedAt: nowIso,
              previousOrderStatus: existing.status,
            })
          );
        }
      }
      await database().batch(statements);
      return reply({ ok: true, deleted: ids.length });
    }

    // 6. Explicit Return Restock Action
    if (data.action === 'restock-return') {
      await actor('orders.manage');
      const input = z
        .object({
          orderId: z.string().max(100),
          itemIndexes: z.array(z.number().int().min(0)).optional(),
          note: z.string().max(500).optional(),
        })
        .parse(data);

      const existing = await sql('SELECT id, details, items, status FROM orders WHERE id=?', input.orderId).first<{
        id: string;
        details: string;
        items: string;
        status: string;
      }>();
      if (!existing) return reply({ error: 'Order not found.' }, 404);

      const details = JSON.parse(existing.details || '{}');
      if (details.returnRestocked) {
        return reply({ error: 'This returned order has already been restocked.' }, 400);
      }

      const items: any[] = JSON.parse(existing.items || '[]');
      const currentProducts = await catalog(true);
      const statements = [...actorGuard(u)];
      const nowIso = new Date().toISOString();

      for (let idx = 0; idx < items.length; idx++) {
        if (input.itemIndexes && !input.itemIndexes.includes(idx)) continue;
        const item = items[idx];
        const prod = currentProducts.find((x) => x.id === item.id);
        if (prod) {
          const hasInternalVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
          const matchedVariant = hasInternalVariants
            ? prod.variants!.find((v) =>
                item.variantId
                  ? v.id === item.variantId
                  : (v.size || 'Standard') === item.size && (!item.color || (v.color || '').toLowerCase() === item.color.toLowerCase())
              ) || prod.variants!.find((v) => (v.size || 'Standard') === item.size)
            : null;

          const sizeStock = prod.sizeStock as Record<string, number> | undefined;
          const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
          let prevStock = 0;
          let newStock = 0;

          if (matchedVariant) {
            prevStock = Number(matchedVariant.stock || 0);
            newStock = prevStock + Number(item.qty || 0);
            matchedVariant.stock = newStock;
            prod.stock = prod.variants!.reduce((acc, v) => acc + Number(v.stock || 0), 0);
          } else if (hasSizeStock && item.size) {
            prevStock = Number(sizeStock![item.size] || 0);
            newStock = prevStock + Number(item.qty || 0);
            sizeStock![item.size] = newStock;
            prod.stock = Object.values(sizeStock!).reduce((acc, v) => acc + Number(v || 0), 0);
          } else {
            prevStock = Number(prod.stock || 0);
            newStock = prevStock + Number(item.qty || 0);
            prod.stock = newStock;
          }

          statements.push(
            sql(
              'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
              prod.id,
              JSON.stringify(prod),
              prod.status || 'Active'
            )
          );

          statements.push(
            sql(
              'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
              crypto.randomUUID(),
              prod.id,
              matchedVariant?.id || null,
              matchedVariant?.sku || prod.sku || prod.id,
              prevStock,
              Number(item.qty || 0),
              newStock,
              'Return Restock',
              input.orderId,
              u.id,
              u.name,
              nowIso
            )
          );
        }
      }

      details.returnRestocked = true;
      details.returnRestockedAt = nowIso;
      details.returnRestockedBy = { id: u.id, name: u.name };
      if (input.note) details.returnRestockNote = input.note;

      statements.push(sql('UPDATE orders SET details=? WHERE id=?', JSON.stringify(details), input.orderId));
      statements.push(
        await audit(u, 'order.return_restocked', input.orderId, `Returned items restocked into inventory for order #${input.orderId}`, {
          orderId: input.orderId,
          restockedBy: u.name,
          note: input.note,
        })
      );

      await database().batch(statements);
      return reply({ ok: true, details });
    }

    // 7. Inventory Logs Query
    if (data.action === 'inventory-logs') {
      const productId = data.productId ? String(data.productId) : undefined;
      const logs = await getInventoryLogs(productId, 150);
      return reply({ ok: true, logs });
    }

    // 8. COD Actions
    if (data.action === 'cod-settle') {
      await actor('orders.manage');
      const input = z
        .object({
          orderId: z.string().max(100),
          amount: z.number().int().min(1).max(10000000),
          settlementDate: z.string().max(30),
          courier: z.string().max(100),
          reference: z.string().max(100).optional(),
          paymentMethod: z.string().max(50),
          note: z.string().max(1000).optional(),
          remittanceId: z.string().max(100).optional(),
        })
        .parse(data);

      const existing = await sql('SELECT id, details, items, total, status FROM orders WHERE id=?', input.orderId).first<{
        id: string;
        details: string;
        items: string;
        total: number;
        status: string;
      }>();
      if (!existing) return reply({ error: 'Order not found.' }, 404);

      const details = JSON.parse(existing.details || '{}');
      const history: any[] = Array.isArray(details.codSettlementHistory) ? details.codSettlementHistory : [];
      const txId = `SET-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newTx = {
        id: txId,
        remittanceId: input.remittanceId || undefined,
        amount: input.amount,
        date: input.settlementDate,
        courier: input.courier,
        reference: input.reference || '',
        paymentMethod: input.paymentMethod,
        note: input.note || '',
        recordedBy: { id: u.id, name: u.name, role: u.role },
        recordedAt: new Date().toISOString(),
        type: 'payment',
      };
      history.push(newTx);
      let netReceived = 0;
      for (const tx of history) {
        if (tx.type === 'reversal') netReceived -= Number(tx.amount || 0);
        else netReceived += Number(tx.amount || 0);
      }
      netReceived = Math.max(0, netReceived);
      const totalExpected = Math.max(0, Number(existing.total || 0));
      const remaining = Math.max(0, totalExpected - netReceived);
      const isSettled = netReceived >= totalExpected && totalExpected > 0;
      const isPartial = netReceived > 0 && !isSettled;
      details.codSettlementHistory = history;
      details.codReceivedAmount = netReceived;
      details.codRemainingAmount = remaining;
      details.codStatus = isSettled ? 'Settled' : isPartial ? 'Partially Settled' : 'Pending';
      details.codSettled = isSettled;
      details.codCollected = netReceived > 0;
      if (isSettled && !details.codSettledAt) {
        details.codSettledAt = input.settlementDate;
      }
      if (!details.courier) {
        details.courier = input.courier;
      }
      const nextStatus = isSettled && existing.status === 'Delivered' ? 'COD Settled' : existing.status;
      const statements = [...actorGuard(u)];
      statements.push(sql('UPDATE orders SET status=?, details=? WHERE id=?', nextStatus, JSON.stringify(details), existing.id));
      statements.push(
        await audit(
          u,
          'cod.settled',
          existing.id,
          `COD settlement of Rs. ${input.amount} recorded for order #${existing.id} (Status: ${details.codStatus}, Remaining: Rs. ${remaining})`,
          {
            orderId: existing.id,
            transactionId: txId,
            amount: input.amount,
            receivedTotal: netReceived,
            remaining,
            courier: input.courier,
            reference: input.reference || '',
            paymentMethod: input.paymentMethod,
            settlementDate: input.settlementDate,
            remittanceId: input.remittanceId,
            newStatus: details.codStatus,
          }
        )
      );
      await database().batch(statements);
      return reply({ ok: true, details, status: nextStatus });
    }

    if (data.action === 'cod-bulk-remittance') {
      await actor('orders.manage');
      const input = z
        .object({
          remittanceId: z.string().max(100),
          courier: z.string().max(100),
          settlementDate: z.string().max(30),
          referenceId: z.string().max(100),
          paymentMethod: z.string().max(50),
          receivedAmount: z.number().int().min(1).max(100000000),
          courierCharges: z.number().int().min(0).max(10000000).optional().default(0),
          adjustments: z.number().int().min(-10000000).max(10000000).optional().default(0),
          notes: z.string().max(1000).optional(),
          orderSettlements: z
            .array(
              z.object({
                orderId: z.string().max(100),
                amount: z.number().int().min(1).max(10000000),
              })
            )
            .min(1)
            .max(500),
        })
        .parse(data);

      const statements = [...actorGuard(u)];
      let matchedTotal = 0;
      for (const item of input.orderSettlements) {
        const existing = await sql('SELECT id, details, total, status FROM orders WHERE id=?', item.orderId).first<{
          id: string;
          details: string;
          total: number;
          status: string;
        }>();
        if (existing) {
          const details = JSON.parse(existing.details || '{}');
          const history: any[] = Array.isArray(details.codSettlementHistory) ? details.codSettlementHistory : [];
          const txId = `SET-REM-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          history.push({
            id: txId,
            remittanceId: input.remittanceId,
            amount: item.amount,
            date: input.settlementDate,
            courier: input.courier,
            reference: input.referenceId,
            paymentMethod: input.paymentMethod,
            note: `Courier Remittance ${input.remittanceId}${input.notes ? ' - ' + input.notes : ''}`,
            recordedBy: { id: u.id, name: u.name, role: u.role },
            recordedAt: new Date().toISOString(),
            type: 'payment',
          });
          let netReceived = 0;
          for (const tx of history) {
            if (tx.type === 'reversal') netReceived -= Number(tx.amount || 0);
            else netReceived += Number(tx.amount || 0);
          }
          netReceived = Math.max(0, netReceived);
          const totalExpected = Math.max(0, Number(existing.total || 0));
          const remaining = Math.max(0, totalExpected - netReceived);
          const isSettled = netReceived >= totalExpected && totalExpected > 0;
          const isPartial = netReceived > 0 && !isSettled;
          details.codSettlementHistory = history;
          details.codReceivedAmount = netReceived;
          details.codRemainingAmount = remaining;
          details.codStatus = isSettled ? 'Settled' : isPartial ? 'Partially Settled' : 'Pending';
          details.codSettled = isSettled;
          details.codCollected = netReceived > 0;
          details.remittanceId = input.remittanceId;
          if (isSettled && !details.codSettledAt) {
            details.codSettledAt = input.settlementDate;
          }
          const nextStatus = isSettled && existing.status === 'Delivered' ? 'COD Settled' : existing.status;
          statements.push(sql('UPDATE orders SET status=?, details=? WHERE id=?', nextStatus, JSON.stringify(details), existing.id));
          matchedTotal += item.amount;
        }
      }
      statements.push(
        await audit(
          u,
          'cod.bulk_remittance',
          input.remittanceId,
          `Courier Remittance ${input.remittanceId} (${input.courier}) processed: ${input.orderSettlements.length} orders settled (Rs. ${matchedTotal} matched, Rs. ${input.receivedAmount} received)`,
          {
            remittanceId: input.remittanceId,
            courier: input.courier,
            referenceId: input.referenceId,
            orderCount: input.orderSettlements.length,
            matchedTotal,
            receivedAmount: input.receivedAmount,
            courierCharges: input.courierCharges,
            adjustments: input.adjustments,
            settlementDate: input.settlementDate,
          }
        )
      );
      await database().batch(statements);
      return reply({ ok: true, matchedCount: input.orderSettlements.length, matchedTotal });
    }

    if (data.action === 'cod-reverse') {
      await actor('orders.manage');
      const input = z
        .object({
          orderId: z.string().max(100),
          transactionId: z.string().max(100),
          reason: z.string().min(3).max(200),
          note: z.string().max(1000).optional(),
        })
        .parse(data);

      const existing = await sql('SELECT id, details, total, status FROM orders WHERE id=?', input.orderId).first<{
        id: string;
        details: string;
        total: number;
        status: string;
      }>();
      if (!existing) return reply({ error: 'Order not found.' }, 404);

      const details = JSON.parse(existing.details || '{}');
      const history: any[] = Array.isArray(details.codSettlementHistory) ? details.codSettlementHistory : [];
      const targetTx = history.find((x) => x.id === input.transactionId);
      if (!targetTx) return reply({ error: 'Transaction not found.' }, 404);

      const revTxId = `REV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      history.push({
        id: revTxId,
        reversalOfId: input.transactionId,
        amount: targetTx.amount,
        date: new Date().toISOString().slice(0, 10),
        courier: targetTx.courier,
        reference: `Reversal of ${targetTx.reference || targetTx.id}`,
        paymentMethod: targetTx.paymentMethod,
        note: input.note || input.reason,
        reason: input.reason,
        recordedBy: { id: u.id, name: u.name, role: u.role },
        recordedAt: new Date().toISOString(),
        type: 'reversal',
      });
      let netReceived = 0;
      for (const tx of history) {
        if (tx.type === 'reversal') netReceived -= Number(tx.amount || 0);
        else netReceived += Number(tx.amount || 0);
      }
      netReceived = Math.max(0, netReceived);
      const totalExpected = Math.max(0, Number(existing.total || 0));
      const remaining = Math.max(0, totalExpected - netReceived);
      const isSettled = netReceived >= totalExpected && totalExpected > 0;
      const isPartial = netReceived > 0 && !isSettled;
      details.codSettlementHistory = history;
      details.codReceivedAmount = netReceived;
      details.codRemainingAmount = remaining;
      details.codStatus = isSettled ? 'Settled' : isPartial ? 'Partially Settled' : 'Pending';
      details.codSettled = isSettled;
      if (!isSettled) {
        details.codSettledAt = undefined;
      }
      const nextStatus = !isSettled && existing.status === 'COD Settled' ? 'Delivered' : existing.status;
      const statements = [...actorGuard(u)];
      statements.push(sql('UPDATE orders SET status=?, details=? WHERE id=?', nextStatus, JSON.stringify(details), existing.id));
      statements.push(
        await audit(
          u,
          'cod.reversed',
          existing.id,
          `COD settlement of Rs. ${targetTx.amount} reversed on order #${existing.id} (${input.reason})`,
          {
            orderId: existing.id,
            reversedTxId: input.transactionId,
            reversalTxId: revTxId,
            amount: targetTx.amount,
            reason: input.reason,
            note: input.note,
            newRemaining: remaining,
            newStatus: details.codStatus,
          }
        )
      );
      await database().batch(statements);
      return reply({ ok: true, details, status: nextStatus });
    }

    if (data.action === 'cod-dispute') {
      await actor('orders.manage');
      const input = z
        .object({
          orderId: z.string().max(100),
          reason: z.enum([
            'Amount Mismatch',
            'Missing Remittance',
            'Wrong Order',
            'Courier Deduction Issue',
            'Duplicate Settlement',
            'Incorrect COD',
            'Other',
          ]),
          notes: z.string().min(2).max(1000),
          resolve: z.boolean().optional(),
        })
        .parse(data);

      const existing = await sql('SELECT id, details, total, status FROM orders WHERE id=?', input.orderId).first<{
        id: string;
        details: string;
        total: number;
        status: string;
      }>();
      if (!existing) return reply({ error: 'Order not found.' }, 404);

      const details = JSON.parse(existing.details || '{}');
      if (input.resolve) {
        details.codDisputed = false;
        details.codDisputeResolvedAt = new Date().toISOString();
        details.codDisputeResolutionNotes = input.notes;
      } else {
        details.codDisputed = true;
        details.codDisputeReason = input.reason;
        details.codDisputeNotes = input.notes;
        details.codDisputedAt = new Date().toISOString();
        details.codStatus = 'Disputed';
      }
      const statements = [...actorGuard(u)];
      statements.push(sql('UPDATE orders SET details=? WHERE id=?', JSON.stringify(details), existing.id));
      statements.push(
        await audit(
          u,
          input.resolve ? 'cod.dispute_resolved' : 'cod.disputed',
          existing.id,
          input.resolve ? `COD dispute resolved on order #${existing.id}: ${input.notes}` : `COD dispute opened on order #${existing.id} (${input.reason}): ${input.notes}`,
          {
            orderId: existing.id,
            reason: input.reason,
            notes: input.notes,
            resolved: Boolean(input.resolve),
          }
        )
      );
      await database().batch(statements);
      return reply({ ok: true, details });
    }

    // 9. Order Status Update & Safe Cancellation Restock
    if (data.action === 'order') {
      await actor('orders.manage');
      const p = z
        .object({
          id: z.string().max(100),
          status: z
            .enum([
              'Test order received',
              'New',
              'Pending',
              'Confirmed',
              'Picklist',
              'Picking',
              'Ready for Packing',
              'Pack & AirwayBill',
              'Packing',
              'Packed',
              'AWB Pending',
              'Ready to Ship',
              'Processing',
              'Dispatched',
              'Shipped',
              'In Transit',
              'Out for Delivery',
              'Delivered',
              'COD Settled',
              'Cancelled',
              'Delivery Failed',
              'Failed Delivery',
              'RTO',
              'Returned to Origin',
              'Return Requested',
              'Returned',
              'Exchange Requested',
              'Exchange Processing',
              'Refund Pending',
              'Refunded',
              'On Hold',
            ])
            .optional(),
          courier: z.string().max(100).optional(),
          trackingNumber: z.string().max(100).optional(),
          csrStatus: z.string().max(100).optional(),
          csrNotes: z.string().max(2000).optional(),
          csrConfirmedAt: z.string().max(100).optional(),
          csrAgent: z.string().max(100).optional(),
          csrHistory: z.array(z.any()).optional(),
          details: z.record(z.string(), z.any()).optional(),
        })
        .parse(data);

      const existing = await sql('SELECT id, details, items, status FROM orders WHERE id=?', p.id).first<{
        id: string;
        details: string;
        items: string;
        status: string;
      }>();
      if (!existing) return reply({ error: 'Order not found.' }, 404);

      const statements = [...actorGuard(u)];
      const details = JSON.parse(existing.details || '{}');
      if (p.courier) details.courier = p.courier;
      if (p.trackingNumber) details.trackingNumber = p.trackingNumber;
      if (p.csrStatus !== undefined) details.csrStatus = p.csrStatus;
      if (p.csrNotes !== undefined) details.csrNotes = p.csrNotes;
      if (p.csrConfirmedAt !== undefined) details.csrConfirmedAt = p.csrConfirmedAt;
      if (p.csrAgent !== undefined) details.csrAgent = p.csrAgent;
      if (p.csrHistory !== undefined) details.csrHistory = p.csrHistory;
      if (p.details) {
        Object.assign(details, p.details);
      }

      const nextStatus = p.status || existing.status;
      const nowIso = new Date().toISOString();

      // Only restore stock on explicit Cancellation (NOT on Returned without explicit restock confirmation)
      if (nextStatus === 'Cancelled' && existing.status !== 'Cancelled' && !details.inventoryRestored) {
        const items = JSON.parse(existing.items || '[]');
        const currentProducts = await catalog(true);

        for (const item of items) {
          const prod = currentProducts.find((x) => x.id === item.id);
          if (prod) {
            const hasInternalVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
            const matchedVariant = hasInternalVariants
              ? prod.variants!.find((v) =>
                  item.variantId
                    ? v.id === item.variantId
                    : (v.size || 'Standard') === item.size && (!item.color || (v.color || '').toLowerCase() === item.color.toLowerCase())
                ) || prod.variants!.find((v) => (v.size || 'Standard') === item.size)
              : null;

            const sizeStock = prod.sizeStock as Record<string, number> | undefined;
            const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
            let prevStock = 0;
            let newStock = 0;

            if (matchedVariant) {
              prevStock = Number(matchedVariant.stock || 0);
              newStock = prevStock + Number(item.qty || 0);
              matchedVariant.stock = newStock;
              prod.stock = prod.variants!.reduce((acc, v) => acc + Number(v.stock || 0), 0);
            } else if (hasSizeStock && item.size) {
              prevStock = Number(sizeStock![item.size] || 0);
              newStock = prevStock + Number(item.qty || 0);
              sizeStock![item.size] = newStock;
              prod.stock = Object.values(sizeStock!).reduce((acc, v) => acc + Number(v || 0), 0);
            } else {
              prevStock = Number(prod.stock || 0);
              newStock = prevStock + Number(item.qty || 0);
              prod.stock = newStock;
            }

            statements.push(
              sql(
                'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
                prod.id,
                JSON.stringify(prod),
                prod.status || 'Active'
              )
            );

            statements.push(
              sql(
                'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                crypto.randomUUID(),
                prod.id,
                matchedVariant?.id || null,
                matchedVariant?.sku || prod.sku || prod.id,
                prevStock,
                Number(item.qty || 0),
                newStock,
                'Cancellation',
                p.id,
                u.id,
                u.name,
                nowIso
              )
            );
          }
        }
        details.inventoryRestored = true;
      }

      statements.push(sql('UPDATE orders SET status=?, details=? WHERE id=?', nextStatus, JSON.stringify(details), p.id));
      statements.push(
        await audit(u, 'order.status_changed', p.id, 'Order status updated', {
          previousStatus: existing.status,
          status: nextStatus,
          csrStatus: details.csrStatus,
          actor: u.name,
          role: u.role,
        })
      );
      await database().batch(statements);
      return reply({ ok: true });
    }

    // 10. Create Return Request
    if (data.action === 'create-return') {
      await actor('orders.manage');
      const input = z
        .object({
          orderId: z.string().max(100),
          items: z.array(
            z.object({
              id: z.string(),
              variantId: z.string().optional(),
              name: z.string(),
              sku: z.string(),
              color: z.string().optional(),
              colorHex: z.string().optional(),
              size: z.string().optional(),
              image: z.string().optional(),
              orderedQty: z.number().int().min(1),
              returnQty: z.number().int().min(1),
              unitPrice: z.number().min(0),
            })
          ).min(1),
          returnReason: z.string().min(2).max(200),
          customerComments: z.string().max(2000).optional(),
          evidenceImages: z.array(z.string().max(2000000)).optional(),
          refundMethod: z.string().max(50).optional(),
          refundAccountTitle: z.string().max(100).optional(),
          refundAccountNumber: z.string().max(100).optional(),
          refundBankName: z.string().max(100).optional(),
          internalNotes: z.string().max(2000).optional(),
        })
        .parse(data);

      const existingOrder = await sql('SELECT id, details, items, status, total, created_at FROM orders WHERE id=?', input.orderId).first<{
        id: string;
        details: string;
        items: string;
        status: string;
        total: number;
        created_at: string;
      }>();
      if (!existingOrder) return reply({ error: 'Order not found.' }, 404);

      if (existingOrder.status === 'Cancelled') {
        return reply({ error: 'A cancelled order cannot create a return request.' }, 400);
      }

      const disallowedForReturn = ['New', 'Pending', 'Test order received', 'Picklist', 'Picking', 'Ready for Packing'];
      if (disallowedForReturn.includes(existingOrder.status)) {
        return reply({ error: `Order #${existingOrder.id} is in "${existingOrder.status}" stage and has not been dispatched/delivered yet. Return cannot be created.` }, 400);
      }

      const orderItems: any[] = JSON.parse(existingOrder.items || '[]');
      const orderDetails: any = JSON.parse(existingOrder.details || '{}');

      // Fetch all existing returns for this order to verify return quantities
      const existingReturns = (await getReturnRequests()).filter((r) => r.orderId === input.orderId && r.returnStatus !== 'Cancelled' && r.returnStatus !== 'Rejected');

      // Validate quantities for each item being returned
      const validatedItems: ReturnItem[] = [];
      let totalRefundable = 0;

      for (const reqItem of input.items) {
        const originalOrderItem = orderItems.find(
          (o) => o.id === reqItem.id && (!reqItem.size || (o.size || 'Standard') === (reqItem.size || 'Standard')) && (!reqItem.color || (o.color || '').toLowerCase() === (reqItem.color || '').toLowerCase())
        ) || orderItems.find((o) => o.id === reqItem.id);

        if (!originalOrderItem) {
          return reply({ error: `Item "${reqItem.name}" was not found in Order #${input.orderId}.` }, 400);
        }

        const maxDeliveredQty = Number(originalOrderItem.qty || 1);
        
        // Sum already returned quantity across prior returns
        let alreadyReturnedQty = 0;
        for (const ret of existingReturns) {
          for (const it of ret.items) {
            if (it.id === reqItem.id && (it.size || 'Standard') === (reqItem.size || 'Standard') && (it.color || '').toLowerCase() === (reqItem.color || '').toLowerCase()) {
              alreadyReturnedQty += Number(it.returnQty || 0);
            }
          }
        }

        const remainingReturnableQty = maxDeliveredQty - alreadyReturnedQty;
        if (reqItem.returnQty > remainingReturnableQty) {
          return reply({
            error: `Cannot return ${reqItem.returnQty}x of "${reqItem.name}". Only ${remainingReturnableQty} units remain eligible for return (${alreadyReturnedQty} already returned from ${maxDeliveredQty} ordered).`,
          }, 400);
        }

        const itemTotal = Number(reqItem.unitPrice || 0) * Number(reqItem.returnQty || 1);
        totalRefundable += itemTotal;

        validatedItems.push({
          id: reqItem.id,
          variantId: reqItem.variantId,
          name: reqItem.name,
          sku: reqItem.sku || originalOrderItem.sku || reqItem.id,
          color: reqItem.color || originalOrderItem.color,
          colorHex: reqItem.colorHex,
          size: reqItem.size || originalOrderItem.size || 'Standard',
          image: reqItem.image || originalOrderItem.image,
          orderedQty: maxDeliveredQty,
          returnQty: reqItem.returnQty,
          unitPrice: reqItem.unitPrice,
          totalPrice: itemTotal,
          restocked: false,
        });
      }

      const returnId = `RET-${input.orderId.replace('ZPK-', '')}-${Date.now().toString().slice(-4)}`;
      const nowIso = new Date().toISOString();

      const initialTimeline: ReturnTimelineEntry[] = [
        {
          id: `tl-${Date.now()}-1`,
          step: 'Requested',
          title: 'Return Request Initiated',
          description: `Return requested for ${validatedItems.reduce((acc, i) => acc + i.returnQty, 0)} items (Reason: ${input.returnReason})${input.customerComments ? ' - Notes: ' + input.customerComments : ''}`,
          actor: u.name,
          actorRole: u.role === 'super_admin' ? 'Super Admin' : 'CSR',
          timestamp: nowIso,
        },
      ];

      const newReturn: ReturnRequest = {
        id: returnId,
        orderId: input.orderId,
        customerName: orderDetails.name || 'Customer',
        customerPhone: orderDetails.phone || '',
        customerAltPhone: orderDetails.alternatePhone,
        customerAddress: orderDetails.address,
        customerCity: orderDetails.city,
        orderDate: existingOrder.created_at,
        deliveryDate: orderDetails.deliveredAt || undefined,
        requestedDate: nowIso,
        returnStatus: 'Requested',
        refundStatus: 'Pending',
        inspectionStatus: 'Pending Inspection',
        inventoryAction: 'Pending',
        items: validatedItems,
        totalRefundableAmount: totalRefundable,
        approvedRefundAmount: totalRefundable,
        returnReason: input.returnReason,
        customerComments: input.customerComments,
        evidenceImages: input.evidenceImages || [],
        internalNotes: input.internalNotes,
        refundMethod: input.refundMethod || (orderDetails.paymentMethod === 'COD' ? 'EasyPaisa' : 'Bank Transfer'),
        refundAccountTitle: input.refundAccountTitle,
        refundAccountNumber: input.refundAccountNumber,
        refundBankName: input.refundBankName,
        timeline: initialTimeline,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await saveReturnRequest(newReturn);

      // Update order details to reflect return status
      orderDetails.returnStatus = 'Requested';
      orderDetails.returnId = returnId;
      await sql('UPDATE orders SET details=? WHERE id=?', JSON.stringify(orderDetails), input.orderId).run();

      await sql(
        'INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,ip,device,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        crypto.randomUUID(),
        u.id,
        returnId,
        'return.created',
        `Return Request ${returnId} created for order #${input.orderId}`,
        JSON.stringify({ returnId, orderId: input.orderId, totalRefundable, itemsCount: validatedItems.length }),
        null,
        null,
        Date.now()
      ).run();

      return reply({ ok: true, returnRequest: newReturn });
    }

    // 11. Update Return Status (Approve, In Transit, Received, Reject, Cancel)
    if (data.action === 'update-return-status') {
      await actor('orders.manage');
      const input = z
        .object({
          returnId: z.string().max(100),
          status: z.enum(['Requested', 'Approved', 'In Transit', 'Received', 'Refunded', 'Rejected', 'Cancelled']),
          rejectionReason: z.string().max(500).optional(),
          courier: z.string().max(100).optional(),
          trackingNumber: z.string().max(100).optional(),
          note: z.string().max(1000).optional(),
        })
        .parse(data);

      const allReturns = await getReturnRequests();
      const targetReturn = allReturns.find((r) => r.id === input.returnId);
      if (!targetReturn) return reply({ error: 'Return request not found.' }, 404);

      if (input.status === 'Rejected' && (!input.rejectionReason || !input.rejectionReason.trim())) {
        return reply({ error: 'A rejection reason is required when rejecting a return.' }, 400);
      }

      const nowIso = new Date().toISOString();
      const previousStatus = targetReturn.returnStatus;
      targetReturn.returnStatus = input.status;
      targetReturn.updatedAt = nowIso;

      if (input.rejectionReason) targetReturn.rejectionReason = input.rejectionReason;
      if (input.courier) targetReturn.courier = input.courier;
      if (input.trackingNumber) targetReturn.trackingNumber = input.trackingNumber;

      if (input.status === 'Rejected') {
        targetReturn.refundStatus = 'Rejected';
      }

      let stepTitle = `Return Status Updated to ${input.status}`;
      let stepDesc = input.note || '';

      if (input.status === 'Approved') {
        stepTitle = 'Return Request Approved';
        stepDesc = input.note || 'Return approved. Awaiting customer shipment / courier pickup.';
      } else if (input.status === 'In Transit') {
        stepTitle = 'Return In Transit';
        stepDesc = `Reverse pickup dispatched via ${input.courier || 'Courier'}${input.trackingNumber ? ' (Tracking: ' + input.trackingNumber + ')' : ''}`;
      } else if (input.status === 'Received') {
        stepTitle = 'Parcel Received at Warehouse';
        stepDesc = input.note || 'Package safely received at warehouse. Ready for quality inspection.';
        targetReturn.inspectionStatus = 'Pending Inspection';
      } else if (input.status === 'Rejected') {
        stepTitle = 'Return Request Rejected';
        stepDesc = `Reason: ${input.rejectionReason}${input.note ? ' - Note: ' + input.note : ''}`;
      }

      targetReturn.timeline.push({
        id: `tl-${Date.now()}`,
        step: input.status as any,
        title: stepTitle,
        description: stepDesc,
        actor: u.name,
        actorRole: u.role,
        timestamp: nowIso,
      });

      await saveReturnRequest(targetReturn);

      // Also update linked order status
      const orderRow = await sql('SELECT id, details FROM orders WHERE id=?', targetReturn.orderId).first<{ id: string; details: string }>();
      if (orderRow) {
        const orderDetails = JSON.parse(orderRow.details || '{}');
        orderDetails.returnStatus = input.status;
        await sql('UPDATE orders SET details=? WHERE id=?', JSON.stringify(orderDetails), targetReturn.orderId).run();
      }

      await sql(
        'INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,ip,device,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        crypto.randomUUID(),
        u.id,
        targetReturn.id,
        'return.status_updated',
        `Return ${targetReturn.id} status changed from ${previousStatus} to ${input.status}`,
        JSON.stringify({ returnId: targetReturn.id, previousStatus, newStatus: input.status, reason: input.rejectionReason }),
        null,
        null,
        Date.now()
      ).run();

      return reply({ ok: true, returnRequest: targetReturn });
    }

    // 12. Inspect Return
    if (data.action === 'inspect-return') {
      await actor('orders.manage');
      const input = z
        .object({
          returnId: z.string().max(100),
          inspectionStatus: z.enum(['Pending Inspection', 'Good Condition', 'Opened/Used', 'Damaged', 'Wrong Item Returned', 'Missing Items']),
          notes: z.string().max(1000).optional(),
        })
        .parse(data);

      const allReturns = await getReturnRequests();
      const targetReturn = allReturns.find((r) => r.id === input.returnId);
      if (!targetReturn) return reply({ error: 'Return request not found.' }, 404);

      const nowIso = new Date().toISOString();
      targetReturn.inspectionStatus = input.inspectionStatus;
      targetReturn.updatedAt = nowIso;
      if (input.notes) {
        targetReturn.internalNotes = targetReturn.internalNotes ? `${targetReturn.internalNotes}\n[Inspection]: ${input.notes}` : `[Inspection]: ${input.notes}`;
      }

      targetReturn.timeline.push({
        id: `tl-${Date.now()}`,
        step: 'Inspected',
        title: `Quality Inspection: ${input.inspectionStatus}`,
        description: input.notes || `Item condition verified as "${input.inspectionStatus}".`,
        actor: u.name,
        actorRole: u.role,
        timestamp: nowIso,
      });

      await saveReturnRequest(targetReturn);

      await sql(
        'INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,ip,device,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        crypto.randomUUID(),
        u.id,
        targetReturn.id,
        'return.inspected',
        `Return ${targetReturn.id} inspected as ${input.inspectionStatus}`,
        JSON.stringify({ returnId: targetReturn.id, inspectionStatus: input.inspectionStatus, notes: input.notes }),
        null,
        null,
        Date.now()
      ).run();

      return reply({ ok: true, returnRequest: targetReturn });
    }

    // 13. Restock Return Items (Restores exact product variant stock and logs to inventory_logs)
    if (data.action === 'restock-return-items') {
      await actor('orders.manage');
      const input = z
        .object({
          returnId: z.string().max(100),
          itemIndexes: z.array(z.number().int().min(0)).optional(), // Restock specific items or all
          note: z.string().max(500).optional(),
          restockAction: z.enum(['restock', 'do_not_restock']).optional().default('restock'),
        })
        .parse(data);

      const allReturns = await getReturnRequests();
      const targetReturn = allReturns.find((r) => r.id === input.returnId);
      if (!targetReturn) return reply({ error: 'Return request not found.' }, 404);

      const nowIso = new Date().toISOString();

      if (input.restockAction === 'do_not_restock') {
        targetReturn.inventoryAction = 'Do Not Restock';
        targetReturn.updatedAt = nowIso;
        targetReturn.timeline.push({
          id: `tl-${Date.now()}`,
          step: 'Inspected',
          title: 'Inventory Action: Marked as Do Not Restock',
          description: input.note || 'Item was not restocked (damaged/opened/wrong item).',
          actor: u.name,
          actorRole: u.role,
          timestamp: nowIso,
        });
        await saveReturnRequest(targetReturn);
        return reply({ ok: true, returnRequest: targetReturn });
      }

      const currentProducts = await catalog(true);
      const statements: any[] = [...actorGuard(u)];
      let restockedAny = false;
      const restockedItemDetails: string[] = [];

      for (let idx = 0; idx < targetReturn.items.length; idx++) {
        if (input.itemIndexes && !input.itemIndexes.includes(idx)) continue;
        const it = targetReturn.items[idx];
        if (it.restocked) continue; // Skip already restocked items

        const prod = currentProducts.find((x) => x.id === it.id);
        if (prod) {
          const hasInternalVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
          const matchedVariant = hasInternalVariants
            ? prod.variants!.find((v) =>
                it.variantId
                  ? v.id === it.variantId
                  : (v.size || 'Standard') === (it.size || 'Standard') && (!it.color || (v.color || '').toLowerCase() === (it.color || '').toLowerCase())
              ) || prod.variants!.find((v) => (v.size || 'Standard') === (it.size || 'Standard'))
            : null;

          const sizeStock = prod.sizeStock as Record<string, number> | undefined;
          const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
          let prevStock = 0;
          let newStock = 0;

          if (matchedVariant) {
            prevStock = Number(matchedVariant.stock || 0);
            newStock = prevStock + Number(it.returnQty || 0);
            matchedVariant.stock = newStock;
            prod.stock = prod.variants!.reduce((acc, v) => acc + Number(v.stock || 0), 0);
          } else if (hasSizeStock && it.size) {
            prevStock = Number(sizeStock![it.size] || 0);
            newStock = prevStock + Number(it.returnQty || 0);
            sizeStock![it.size] = newStock;
            prod.stock = Object.values(sizeStock!).reduce((acc, v) => acc + Number(v || 0), 0);
          } else {
            prevStock = Number(prod.stock || 0);
            newStock = prevStock + Number(it.returnQty || 0);
            prod.stock = newStock;
          }

          statements.push(
            sql(
              'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
              prod.id,
              JSON.stringify(prod),
              prod.status || 'Active'
            )
          );

          statements.push(
            sql(
              'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
              crypto.randomUUID(),
              prod.id,
              matchedVariant?.id || null,
              matchedVariant?.sku || prod.sku || prod.id,
              prevStock,
              Number(it.returnQty || 0),
              newStock,
              'Return Restock',
              targetReturn.orderId,
              u.id,
              u.name,
              nowIso
            )
          );

          it.restocked = true;
          it.restockedAt = nowIso;
          it.restockedBy = u.name;
          restockedAny = true;
          restockedItemDetails.push(`+${it.returnQty} ${it.name} (${it.color || ''} / ${it.size || ''})`);
        }
      }

      if (!restockedAny) {
        return reply({ error: 'All selected items have already been restocked into inventory.' }, 400);
      }

      targetReturn.inventoryAction = 'Restocked';
      targetReturn.updatedAt = nowIso;
      targetReturn.timeline.push({
        id: `tl-${Date.now()}`,
        step: 'Restocked',
        title: 'Items Restocked into Exact Variant Inventory',
        description: restockedItemDetails.join(', ') + (input.note ? ` - Note: ${input.note}` : ''),
        actor: u.name,
        actorRole: u.role,
        timestamp: nowIso,
      });

      await database().batch(statements);
      await saveReturnRequest(targetReturn);

      return reply({ ok: true, returnRequest: targetReturn });
    }

    // 14. Process Refund
    if (data.action === 'process-refund') {
      await actor('orders.manage');
      const input = z
        .object({
          returnId: z.string().max(100),
          refundAmount: z.number().int().min(0).max(10000000),
          refundMethod: z.string().min(2).max(50),
          refundAccountTitle: z.string().max(100).optional(),
          refundAccountNumber: z.string().max(100).optional(),
          refundBankName: z.string().max(100).optional(),
          refundReference: z.string().min(1).max(100),
          refundNotes: z.string().max(1000).optional(),
        })
        .parse(data);

      const allReturns = await getReturnRequests();
      const targetReturn = allReturns.find((r) => r.id === input.returnId);
      if (!targetReturn) return reply({ error: 'Return request not found.' }, 404);

      if (targetReturn.refundStatus === 'Refunded') {
        return reply({ error: 'This return request has already been refunded.' }, 400);
      }

      if (input.refundAmount > targetReturn.totalRefundableAmount) {
        return reply({ error: `Refund amount (Rs. ${input.refundAmount}) cannot exceed total refundable amount (Rs. ${targetReturn.totalRefundableAmount}).` }, 400);
      }

      const nowIso = new Date().toISOString();
      targetReturn.refundStatus = 'Refunded';
      targetReturn.returnStatus = 'Refunded';
      targetReturn.approvedRefundAmount = input.refundAmount;
      targetReturn.refundMethod = input.refundMethod;
      targetReturn.refundAccountTitle = input.refundAccountTitle;
      targetReturn.refundAccountNumber = input.refundAccountNumber;
      targetReturn.refundBankName = input.refundBankName;
      targetReturn.refundReference = input.refundReference;
      targetReturn.refundedAt = nowIso;
      targetReturn.refundedBy = u.name;
      targetReturn.updatedAt = nowIso;

      targetReturn.timeline.push({
        id: `tl-${Date.now()}`,
        step: 'Refunded',
        title: `Refund Processed: Rs. ${input.refundAmount} via ${input.refundMethod}`,
        description: `Ref / Tx ID: ${input.refundReference}${input.refundAccountTitle ? ' (A/C Title: ' + input.refundAccountTitle + ')' : ''}${input.refundNotes ? ' - Note: ' + input.refundNotes : ''}`,
        actor: u.name,
        actorRole: u.role,
        timestamp: nowIso,
      });

      await saveReturnRequest(targetReturn);

      // Update linked order's refund status
      const orderRow = await sql('SELECT id, details FROM orders WHERE id=?', targetReturn.orderId).first<{ id: string; details: string }>();
      if (orderRow) {
        const orderDetails = JSON.parse(orderRow.details || '{}');
        orderDetails.refundStatus = 'Refunded';
        orderDetails.refundAmount = input.refundAmount;
        orderDetails.refundMethod = input.refundMethod;
        orderDetails.refundReference = input.refundReference;
        orderDetails.refundedAt = nowIso;
        await sql('UPDATE orders SET details=? WHERE id=?', JSON.stringify(orderDetails), targetReturn.orderId).run();
      }

      await sql(
        'INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,ip,device,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        crypto.randomUUID(),
        u.id,
        targetReturn.id,
        'return.refunded',
        `Refund of Rs. ${input.refundAmount} processed for return ${targetReturn.id} (${input.refundMethod})`,
        JSON.stringify({ returnId: targetReturn.id, refundAmount: input.refundAmount, refundMethod: input.refundMethod, refundReference: input.refundReference }),
        null,
        null,
        Date.now()
      ).run();

      return reply({ ok: true, returnRequest: targetReturn });
    }

    // 15. Add Internal Return Note
    if (data.action === 'add-return-note') {
      await actor('orders.manage');
      const input = z
        .object({
          returnId: z.string().max(100),
          note: z.string().min(1).max(2000),
        })
        .parse(data);

      const allReturns = await getReturnRequests();
      const targetReturn = allReturns.find((r) => r.id === input.returnId);
      if (!targetReturn) return reply({ error: 'Return request not found.' }, 404);

      const nowIso = new Date().toISOString();
      targetReturn.internalNotes = targetReturn.internalNotes ? `${targetReturn.internalNotes}\n[${u.name}]: ${input.note}` : `[${u.name}]: ${input.note}`;
      targetReturn.updatedAt = nowIso;

      targetReturn.timeline.push({
        id: `tl-${Date.now()}`,
        step: 'Note Added',
        title: 'Staff Internal Note Added',
        description: input.note,
        actor: u.name,
        actorRole: u.role,
        timestamp: nowIso,
      });

      await saveReturnRequest(targetReturn);
      return reply({ ok: true, returnRequest: targetReturn });
    }

    return reply({ error: 'Unknown action.' }, 400);
  } catch (e) {
    if (e instanceof z.ZodError) return reply({ error: e.issues[0]?.message || 'Check the entered values.' }, 400);
    return fail(e);
  }
}
