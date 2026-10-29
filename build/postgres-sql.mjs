// Compatibility for the SQLite expressions used by the existing D1 routes.
// Only server-authored SQL reaches this module; values always stay parameters.
export function compileSql(source, values = [], previousChanges = 0) {
  const literals = [];
  let sql = source.replace(/'(?:''|[^'])*'/g, value => {
    literals.push(value);
    return `__SQL_LITERAL_${literals.length - 1}__`;
  });
  sql = sql.replace(/`([^`]+)`/g, '"$1"')
    .replace(/\b([\w.]+)\s+COLLATE\s+NOCASE\b/gi, 'lower($1)')
    .replace(/\bLIKE\b/gi, 'ILIKE')
    .replace(/\bBLOB\b/gi, 'BYTEA')
    .replace(/\bINTEGER\b/gi, 'BIGINT')
    .replace(/\bchanges\s*\(\s*\)/gi, String(previousChanges))
    .replace(/\bIS\s+(?=\?)/gi, 'IS NOT DISTINCT FROM ');
  sql = sql.replace(/\bjson_extract\(\s*([\w.]+)\s*,\s*__SQL_LITERAL_(\d+)__\s*\)/gi, (_match, column, index) => {
    const path = literals[Number(index)].match(/^'\$\.([a-zA-Z][a-zA-Z0-9_]*)'$/);
    if (!path) throw new Error('Unsupported SQLite JSON path');
    return `(${column}::jsonb ->> '${path[1]}')`;
  });
  let index = 0;
  // Quoted identifiers may legally contain '?'; leave them intact as well.
  sql = sql.replace(/"(?:""|[^"])*"|\?/g, token => {
    if (token !== '?') return token;
    const value = values[index++];
    const type = typeof value === 'number' ? '::bigint' : '';
    return `($${index}${type})`;
  });
  if (index !== values.length) throw new Error('SQL parameter count mismatch');
  return sql.replace(/__SQL_LITERAL_(\d+)__/g, (_match, i) => literals[Number(i)]);
}
