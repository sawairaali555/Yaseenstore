import postgres from 'postgres';
import { Buffer } from 'node:buffer';
import { compileSql } from './postgres-sql.mjs';
import snapshot from '../data/vercel-storefront-snapshot.json';

const schema = 'yaseenstore';
type Value = string | number | null | Uint8Array | ArrayBuffer;
type Result<T> = { success: true; results: T[]; meta: { changes: number } };
type Executor = { unsafe: (sql: string, values?: any[]) => Promise<any> };

function safeInteger(value: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('Database integer exceeds JavaScript safe range');
  return number;
}

export class SupabaseStatement {
  constructor(readonly db: SupabaseDatabase, readonly query: string, readonly values: Value[] = []) {}
  bind(...values: Value[]) { return new SupabaseStatement(this.db, this.query, values); }
  async all<T = Record<string, unknown>>(): Promise<Result<T>> { return this.db.execute<T>(this); }
  async run<T = Record<string, unknown>>(): Promise<Result<T>> { return this.db.execute<T>(this); }
  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const result = await this.all<T>();
    const row = result.results[0];
    return row ? (column ? (row as any)[column] : row) : null;
  }
}

export class SupabaseDatabase {
  readonly provider = 'supabase';
  private client;
  private initialized?: Promise<void>;
  constructor(url: string) {
    this.client = postgres(url, {
      // Transaction pooling does not support connection-scoped prepared statements.
      prepare: false, max: 3, idle_timeout: 20, connect_timeout: 10,
      ssl: 'require',
      types: { safeInteger: { to: 20, from: [20], serialize: String, parse: safeInteger } },
      onnotice: () => {},
    });
  }
  prepare(query: string) { return new SupabaseStatement(this, query); }
  private initialize(): Promise<void> {
    // Seed the public source snapshot once. Never overwrite a merchant's edits,
    // stock counts, orders or credentials on later deployments/cold starts.
    this.initialized ??= (async () => {
      await this.client.begin(async transaction => {
        await transaction.unsafe(`SET LOCAL search_path TO ${schema}, pg_catalog`);
        await transaction.unsafe('SELECT pg_advisory_xact_lock(783916540)');
        const state = await transaction.unsafe("SELECT id FROM backend_state WHERE id='public-snapshot-v1'");
        if (state.length) return;
        for (const product of snapshot.catalog) {
          await transaction.unsafe('INSERT INTO catalog_records (id,data,status) VALUES ($1,$2,$3) ON CONFLICT(id) DO NOTHING', [product.id, JSON.stringify(product), product.status || 'Active']);
        }
        await transaction.unsafe("INSERT INTO store_settings (id,data) VALUES ('store',$1) ON CONFLICT(id) DO NOTHING", [JSON.stringify(snapshot.settings)]);
        const seedCategories = async (nodes: any[], parent: string | null = null, depth = 0) => {
          for (const node of nodes) {
            await transaction.unsafe('INSERT INTO category_nodes (id,parent_id,name,slug,image,enabled,display_order,description,meta_title,meta_keywords,meta_description,depth) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(id) DO NOTHING', [node.id, node.parentId || parent, node.name, node.slug, node.image || '', node.enabled === false ? 0 : 1, node.displayOrder || 0, node.description || '', node.metaTitle || '', node.metaKeywords || '', node.metaDescription || '', node.depth ?? depth]);
            await seedCategories(node.children || [], node.id, depth + 1);
          }
        };
        await seedCategories(snapshot.categories);
        await transaction.unsafe("INSERT INTO access_users (id,email,name,role,status,created_at) VALUES ('storefront-guest','guest@store.invalid','Store Customer','member','active',$1) ON CONFLICT(id) DO NOTHING", [Date.now()]);
        await transaction.unsafe("INSERT INTO backend_state (id) VALUES ('public-snapshot-v1')");
      });
    })().catch(error => { this.initialized = undefined; throw error; });
    return this.initialized;
  }
  private async query<T>(transaction: Executor, statement: SupabaseStatement, changes = 0): Promise<Result<T>> {
    const sql = compileSql(statement.query, statement.values, changes);
    const values = statement.values.map(value => value instanceof ArrayBuffer
      ? Buffer.from(value) : value instanceof Uint8Array ? Buffer.from(value) : value);
    const rows = await transaction.unsafe(sql, values);
    return { success: true, results: Array.from(rows) as T[], meta: { changes: rows.count || 0 } };
  }
  async execute<T>(statement: SupabaseStatement): Promise<Result<T>> {
    const [result] = await this.batch<T>([statement]);
    return result;
  }
  async batch<T = Record<string, unknown>>(statements: SupabaseStatement[]): Promise<Result<T>[]> {
    await this.initialize();
    // Serializable retries are intentionally left to callers: a stock or
    // authorization conflict must fail closed, never replay an external action.
    try { return await this.client.begin('isolation level serializable', async transaction => {
      await transaction.unsafe(`SET LOCAL search_path TO ${schema}, pg_catalog`);
      const results: Result<T>[] = [];
      let changes = 0;
      for (const statement of statements) {
        if (statement.db !== this) throw new Error('Statement belongs to another database');
        const result = await this.query<T>(transaction as unknown as Executor, statement, changes);
        results.push(result);
        if (/^\s*(INSERT|UPDATE|DELETE)\b/i.test(statement.query)) changes = result.meta.changes;
      }
      return results;
    }) as Result<T>[]; } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && ['40001','40P01','23514'].includes(String(error.code))) {
        throw new Error('Authorization changed. Refresh and try again.', { cause: error });
      }
      throw error;
    }
  }
}

let database: SupabaseDatabase | undefined;
export function supabaseDatabase(): D1Database | null {
  const url = process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  database ??= new SupabaseDatabase(url);
  // The application uses prepare/bind/first/all/run/batch from the D1 contract.
  return database as unknown as D1Database;
}
