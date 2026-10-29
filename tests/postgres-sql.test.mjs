import test from 'node:test';
import assert from 'node:assert/strict';
import { compileSql } from '../build/postgres-sql.mjs';

test('Postgres parameters preserve strings, JSON and large millisecond timestamps', () => {
  const sql = compileSql("SELECT '?' AS literal, json_extract(details, '$.tenantId') FROM orders WHERE id=? AND created_at>?", ['order', 1793275200000]);
  assert.equal(sql, "SELECT '?' AS literal, (details::jsonb ->> 'tenantId') FROM orders WHERE id=($1) AND created_at>($2::bigint)");
  assert.equal(compileSql("SELECT 'don''t replace ? LIKE INTEGER' WHERE id=?", ["' OR true --"]), "SELECT 'don''t replace ? LIKE INTEGER' WHERE id=($1)");
});

test('Postgres null-safe revision guards and stock mutation counts match D1 semantics', () => {
  assert.equal(compileSql('SELECT id FROM orders WHERE "total" IS ? AND "details" IS ?', [null, '{}']), 'SELECT id FROM orders WHERE "total" IS NOT DISTINCT FROM ($1) AND "details" IS NOT DISTINCT FROM ($2)');
  assert.equal(compileSql('INSERT INTO access_guard (id,ok) SELECT ?,CASE WHEN changes()=1 THEN 1 ELSE 0 END', ['guard'], 0), 'INSERT INTO access_guard (id,ok) SELECT ($1),CASE WHEN 0=1 THEN 1 ELSE 0 END');
  assert.match(compileSql('SELECT id FROM access_users WHERE name LIKE ? ORDER BY name COLLATE NOCASE', ['%a%']), /name ILIKE \(\$1\) ORDER BY lower\(name\)/);
  assert.throws(() => compileSql('SELECT ?', []), /parameter count/);
  assert.throws(() => compileSql("SELECT json_extract(details, '$[0]')", []), /JSON path/);
});
