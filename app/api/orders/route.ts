import { actor, blocked, AccessError, fail, actorGuard, sql, origin } from '@/lib/access/server';
import { database, ensureInventoryTables } from '@/lib/store-data';
import { getDb } from '@/db';
import { orders } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { effectivePrice } from '@/app/catalog';
import { catalog, settings, deliveryFor } from '@/lib/store-data';
import { z } from 'zod';
import { has } from '@/lib/access/policy';
import { validateCartItems } from '@/lib/inventory-engine';
import type { Product } from '@/app/catalog';

const itemSchema = z.object({
  id: z.string(),
  qty: z.number().int().min(1).max(50),
  size: z.string().max(30),
  color: z.string().max(50).optional(),
  variantId: z.string().max(100).optional(),
  discount: z.number().int().min(0).max(1000000).optional(),
});

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().regex(/^(03\d{9}|\+923\d{9})$/),
  email: z.union([z.literal(''), z.string().email().max(100)]).optional(),
  address: z.string().trim().min(4).max(250),
  city: z.string().trim().min(2).max(60),
  state: z.string().max(80).optional(),
  province: z.string().max(80).optional(),
  landmark: z.string().max(120).optional(),
  alternatePhone: z.string().max(25).optional(),
  source: z.string().max(80).optional(),
  postal: z.string().regex(/^(\d{5})?$/).optional(),
  note: z.string().max(500).optional(),
  paymentMethod: z.string().optional(),
  csrStatus: z.string().max(80).optional(),
  csrAgent: z.string().max(80).optional(),
  csrConfirmedAt: z.string().max(80).optional(),
  csrNotes: z.string().max(1000).optional(),
  csrHistory: z.array(z.any()).optional(),
  customDelivery: z.number().int().min(0).max(10000).optional(),
  customDiscount: z.number().min(0).max(1000000).optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  deliveryOverride: z.boolean().optional(),
  status: z.string().max(80).optional(),
  items: z.array(itemSchema).min(1).max(50),
});

export async function POST(req: Request) {
  try {
    origin(req);
    const user = await actor();
    if (await blocked(user.id, 'mute')) {
      throw new AccessError(403, 'Your account is restricted from placing orders.');
    }
    if (Number(req.headers.get('content-length') || 0) > 35000) {
      return Response.json({ error: 'Order payload is too large.' }, { status: 413 });
    }

    const rawBody: any = await req.json().catch(() => ({}));
    if (rawBody && typeof rawBody.phone === 'string') {
      let p = rawBody.phone.replace(/[^\d+]/g, '').trim();
      if (p.startsWith('+92')) p = '0' + p.slice(3);
      else if (p.startsWith('923') && p.length === 12) p = '0' + p.slice(2);
      else if (p.startsWith('3') && p.length === 10) p = '0' + p;
      rawBody.phone = p;
    }

    const parsed = schema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        { error: 'Please check your name, Pakistani mobile number and delivery address.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { items, ...details } = parsed.data;
    const managesOrders = has(user, 'orders.manage');
    if (!managesOrders && (
      items.some(item => item.discount !== undefined) ||
      ['customDelivery', 'customDiscount', 'discountType', 'deliveryOverride', 'status',
        'csrStatus', 'csrAgent', 'csrConfirmedAt', 'csrNotes', 'csrHistory']
        .some(key => Object.prototype.hasOwnProperty.call(details, key))
    )) {
      throw new AccessError(403, 'Only order-management staff can override prices or order status.');
    }
    await ensureInventoryTables();
    // Compare the original records inside the write batch so concurrent sales cannot overwrite stock.
    const snapshots = await sql('SELECT id,data,status FROM catalog_records').all<{id: string; data: string; status: string}>();
    const [allProducts, config] = await Promise.all([catalog(true), settings()]);
    const activeProducts = allProducts.filter((p) => p.status === 'Active');
    const validation = validateCartItems(items, activeProducts);
    if (!validation.valid) {
      return Response.json({ error: validation.items.find(item => item.status !== 'ok')?.message || 'Please update your shopping bag.', validation }, { status: 409 });
    }

    let subtotal = 0;
    let totalItemDiscounts = 0;
    const seen = new Set<string>();
    const pricedItems: {
      id: string;
      sku: string;
      name: string;
      color: string;
      size: string;
      variantId?: string;
      qty: number;
      unitPrice: number;
      discount: number;
      totalPrice: number;
      image: string;
    }[] = [];

    const productUpdates = new Map<string, Product>();
    const inventoryMovements: Array<{
      productId: string;
      variantId?: string;
      sku: string;
      previousStock: number;
      change: number;
      newStock: number;
      reason: string;
    }> = [];

    const nowIso = new Date().toISOString();
    const orderId = 'ZPK-' + crypto.randomUUID().slice(0, 8).toUpperCase();

    for (const i of items) {
      const itemKey = i.id + ':' + (i.variantId || (i.size + ':' + (i.color || '')));
      if (seen.has(itemKey)) {
        return Response.json({ error: 'Duplicate item line in bag. Please review your order.' }, { status: 400 });
      }
      seen.add(itemKey);

      const p = activeProducts.find((x) => x.id === i.id);
      if (!p || p.status !== 'Active') {
        return Response.json({ error: `The product "${p?.name || i.id}" is currently unavailable.` }, { status: 400 });
      }

      const currentTarget = productUpdates.get(p.id) || structuredClone(p);
      const hasInternalVariants = Array.isArray(currentTarget.variants) && currentTarget.variants.length > 0;
      const matchedVariant = hasInternalVariants
        ? currentTarget.variants!.find((v) =>
            i.variantId
              ? v.id === i.variantId
              : (v.size || 'Standard') === i.size && (!i.color || (v.color || '').toLowerCase() === i.color.toLowerCase())
          )
        : null;

      const sizeStock = currentTarget.sizeStock as Record<string, number> | undefined;
      const hasSizeStock = Boolean(sizeStock && Object.keys(sizeStock).length > 0);
      let previousStock = 0;

      if (matchedVariant) {
        previousStock = Number(matchedVariant.stock || 0);
      } else if (hasSizeStock) {
        previousStock = Number(sizeStock![i.size] || 0);
      } else {
        previousStock = Number(currentTarget.stock || 0);
      }

      const allowsBackorders = Boolean(currentTarget.allowBackorders);
      if (previousStock <= 0 && !allowsBackorders) {
        return Response.json(
          { error: `"${p.name}" (${i.size}${i.color ? ` - ${i.color}` : ''}) is out of stock.` },
          { status: 400 }
        );
      }

      if (i.qty < 1 || (i.qty > previousStock && !allowsBackorders)) {
        return Response.json(
          { error: `Only ${previousStock} unit(s) of "${p.name}" (${i.size}${i.color ? ` - ${i.color}` : ''}) are currently available.` },
          { status: 400 }
        );
      }

      const newStock = Math.max(0, previousStock - i.qty);
      const sku = matchedVariant?.sku || currentTarget.sku || currentTarget.id;

      if (matchedVariant) {
        matchedVariant.stock = newStock;
        currentTarget.stock = currentTarget.variants!.reduce((acc, v) => acc + Number(v.stock || 0), 0);
      } else if (hasSizeStock) {
        sizeStock![i.size] = newStock;
        currentTarget.stock = Object.values(sizeStock!).reduce((acc, v) => acc + Number(v || 0), 0);
      } else {
        currentTarget.stock = newStock;
      }

      // Record movement
      inventoryMovements.push({
        productId: currentTarget.id,
        variantId: matchedVariant?.id,
        sku,
        previousStock,
        change: -i.qty,
        newStock,
        reason: 'Sale',
      });

      productUpdates.set(p.id, currentTarget);

      const unitPrice = matchedVariant?.price && Number(matchedVariant.price) > 0
        ? Number(matchedVariant.price)
        : effectivePrice(p);
      const itemDiscount = Math.max(0, Number(i.discount || 0));
      totalItemDiscounts += itemDiscount;
      const totalPrice = Math.max(0, unitPrice * i.qty - itemDiscount);
      subtotal += totalPrice;

      pricedItems.push({
        id: p.id,
        sku,
        name: p.name,
        color: matchedVariant?.color || i.color || p.color || '',
        size: matchedVariant?.size || i.size,
        variantId: matchedVariant?.id || i.variantId,
        qty: i.qty,
        unitPrice,
        discount: itemDiscount,
        totalPrice,
        image: matchedVariant?.image || p.image || '',
      });
    }

    const token = crypto.randomUUID();
    const deliveryCharge = details.customDelivery !== undefined ? details.customDelivery : deliveryFor(subtotal, config);
    const orderDiscount = details.discountType === 'percentage'
      ? Math.round(subtotal * Math.min(100, details.customDiscount || 0) / 100)
      : Math.min(subtotal, details.customDiscount || 0);
    const total = Math.max(0, subtotal + deliveryCharge - orderDiscount);
    const initialStatus = details.status || (details.csrStatus === 'Confirmed' ? 'Picklist' : 'Test order received');

    const initialHistory = details.csrHistory || [
      {
        id: Math.random().toString(36).slice(2, 9),
        time: nowIso,
        status: (details.csrStatus || 'Confirmed') as any,
        note: `Order placed via ${details.source || 'Web Store'}${details.note ? ` (Note: ${details.note})` : ''}`,
        agent: details.csrAgent || user.name || 'Storefront System',
      },
    ];

    const savedDetails = {
      ...details,
      inventoryRestored: false,
      deliveryCharge,
      discount: orderDiscount + totalItemDiscounts,
      orderDiscount,
      itemDiscountsTotal: totalItemDiscounts,
      csrStatus: details.csrStatus || (initialStatus === 'Picklist' ? 'Confirmed' : 'Pending'),
      csrConfirmedAt: details.csrStatus === 'Confirmed' ? details.csrConfirmedAt || nowIso : undefined,
      csrAgent: details.csrAgent || user.name || undefined,
      csrHistory: initialHistory,
    };

    const statements = [...actorGuard(user)];

    // 1. Atomic product updates
    for (const [prodId, updatedProd] of productUpdates.entries()) {
      const snapshot = snapshots.results.find(row => row.id === prodId);
      const guardId = crypto.randomUUID();
      statements.push(snapshot
        ? sql('INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM catalog_records WHERE id=? AND data=? AND status=?) THEN 1 ELSE 0 END', guardId, prodId, snapshot.data, snapshot.status)
        : sql('INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN NOT EXISTS(SELECT 1 FROM catalog_records WHERE id=?) THEN 1 ELSE 0 END', guardId, prodId));
      statements.push(sql('DELETE FROM access_guard WHERE id=?', guardId));
      statements.push(
        sql(
          'INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status',
          prodId,
          JSON.stringify(updatedProd),
          updatedProd.status
        )
      );
    }

    // 2. Inventory audit log statements
    for (const mv of inventoryMovements) {
      statements.push(
        sql(
          'INSERT INTO inventory_logs (id,product_id,variant_id,sku,previous_stock,change,new_stock,reason,order_id,actor_id,actor_name,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          crypto.randomUUID(),
          mv.productId,
          mv.variantId || null,
          mv.sku || null,
          mv.previousStock,
          mv.change,
          mv.newStock,
          mv.reason,
          orderId,
          user.id,
          user.name || 'Store Customer',
          nowIso
        )
      );
    }

    // 3. Order record creation
    statements.push(
      sql(
        'INSERT INTO orders (id,token,details,items,total,status,created_at) VALUES (?,?,?,?,?,?,?)',
        orderId,
        token,
        JSON.stringify(savedDetails),
        JSON.stringify(pricedItems),
        total,
        initialStatus,
        nowIso
      )
    );

    // 4. Access audit
    try {
      const auditStmt = await sql(
        'INSERT INTO access_audit (id,actor_id,target_id,action,reason,metadata,ip,device,created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        crypto.randomUUID(),
        user.id,
        orderId,
        'order.created',
        `Order created via ${details.source || 'Storefront'} (${initialStatus})`,
        JSON.stringify({ total, deliveryCharge, discount: savedDetails.discount, source: details.source, itemsCount: pricedItems.length }),
        null,
        null,
        Date.now()
      );
      statements.push(auditStmt);
    } catch {}

    try {
      await database().batch(statements);
    } catch (error) {
      if (error instanceof Error && /CHECK constraint|Authorization changed/i.test(error.message)) {
        throw new AccessError(409, 'Stock or account access changed while placing your order. Refresh your bag and try again.');
      }
      throw error;
    }

    return Response.json(
      {
        id: orderId,
        token,
        total,
        status: initialStatus,
        details: savedDetails,
        items: pricedItems,
        created_at: nowIso,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    return fail(e);
  }
}

export async function GET(req: Request) {
  try {
    await actor();
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '';
    const token = url.searchParams.get('token') || '';
    if (!id || !token) return Response.json({ error: 'Enter your order reference and tracking key.' }, { status: 400 });
    const [order] = await getDb().select({ id: orders.id, total: orders.total, status: orders.status, createdAt: orders.createdAt }).from(orders).where(and(eq(orders.id, id), eq(orders.token, token))).limit(1);
    if (!order) return Response.json({ error: 'Order not found. Check your reference and tracking key.' }, { status: 404 });
    return Response.json(order, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return fail(e);
  }
}
