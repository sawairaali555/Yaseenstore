#!/usr/bin/env node
// Run once after deployment (and safely rerun if needed):
// CATEGORY_SYNC_COOKIE='session=...' node scripts/sync-category-availability.mjs https://your-store.example
const baseUrl = process.argv[2];
const cookie = process.env.CATEGORY_SYNC_COOKIE;
if (!baseUrl || !cookie) {
  console.error('Usage: CATEGORY_SYNC_COOKIE=<admin-session-cookie> node scripts/sync-category-availability.mjs <store-base-url>');
  process.exitCode = 2;
} else {
  try {
    const url = new URL('/api/categories', baseUrl);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, Origin: url.origin },
      body: JSON.stringify({ action: 'sync-availability' }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    const categories = [];
    const walk = nodes => nodes.forEach(node => { categories.push(node); walk(node.children || []); });
    walk(result.categories || []);
    console.log(`Synced ${categories.length} categories; ${categories.filter(node => node.autoDisabled).length} auto-disabled for no stock.`);
  } catch (error) {
    console.error(`Category sync failed: ${error.message}`);
    process.exitCode = 1;
  }
}
