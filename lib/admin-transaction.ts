import { database, catalog, getReturnRequests, returnRequestStatement, syncCategoryAvailability } from './store-data';
import { actorGuard, sql } from './access/server';
import type { User } from './access/policy';
import type { ReturnRequest } from './return-types';

type Row = Record<string, string | number | null> & { id: string };
type Statement = ReturnType<typeof sql>;

// Compare only records this operation writes; guards run before all mutations.
export function adminTransaction(user: User, tenantId = 'zeliy-pakistan') {
  const snapshots = new Map<string, { table: string; row: Row | null; id: string }>();
  const touched = new Set<string>();
  const remember = (table: string, id: string, row: Row | null) => {
    const key = `${table}:${id}`;
    if (!snapshots.has(key)) snapshots.set(key, { table, id, row });
    return key;
  };
  return {
    async catalog() {
      const rows = await sql('SELECT id,data,status FROM catalog_records').all<Row>();
      const byId = new Map(rows.results.map(row => [row.id, row]));
      const products = structuredClone(await catalog(true));
      for (const product of products) remember('catalog_records', product.id, byId.get(product.id) || null);
      return products;
    },
    async order(id: string) {
      const row = await sql("SELECT id,details,items,total,status,created_at FROM orders WHERE id=? AND (json_extract(details, '$.tenantId')=? OR (json_extract(details, '$.tenantId') IS NULL AND ?='zeliy-pakistan'))", id, tenantId, tenantId).first<Row>();
      touched.add(remember('orders', id, row));
      return row as (Row & { details: string; items: string; total: number; status: string; created_at: string }) | null;
    },
    async returns() {
      const rows = await sql('SELECT * FROM return_requests').all<Row>();
      const byId = new Map(rows.results.map(row => [row.id, row]));
      const returns = await getReturnRequests();
      for (const ret of returns) remember('return_requests', ret.id, byId.get(ret.id) || null);
      return returns;
    },
    product(product: { id: string; status: string }) {
      touched.add(remember('catalog_records', product.id, null));
      return sql('INSERT INTO catalog_records (id,data,status) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,status=excluded.status', product.id, JSON.stringify(product), product.status);
    },
    return(ret: ReturnRequest) {
      touched.add(remember('return_requests', ret.id, null));
      return returnRequestStatement(ret);
    },
    async commit(statements: Statement[]) {
      const guards: Statement[] = [...actorGuard(user)];
      for (const key of touched) {
        const { table, id, row } = snapshots.get(key)!;
        const guardId = crypto.randomUUID();
        const entries = row ? Object.entries(row) : [];
        const predicate = entries.map(([column]) => `"${column}" IS ?`).join(' AND ');
        guards.push(row
          ? sql(`INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN EXISTS(SELECT 1 FROM ${table} WHERE ${predicate}) THEN 1 ELSE 0 END`, guardId, ...entries.map(([, value]) => value))
          : sql(`INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN NOT EXISTS(SELECT 1 FROM ${table} WHERE id=?) THEN 1 ELSE 0 END`, guardId, id));
        guards.push(sql('DELETE FROM access_guard WHERE id=?', guardId));
      }
      await database().batch([...guards, ...statements]);
      if ([...touched].some(key => key.startsWith('catalog_records:'))) await syncCategoryAvailability();
    },
  };
}
