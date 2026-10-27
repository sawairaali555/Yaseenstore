import assert from "node:assert/strict";
import test from "node:test";
import { Miniflare } from 'miniflare';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

test("renders the production storefront in the Workers runtime", async (context) => {
  const root = fileURLToPath(new URL('../dist/server/', import.meta.url));
  const files = await readdir(root, { recursive: true });
  const names = ['index.js', ...files.filter(name => name.endsWith('.js') && name !== 'index.js')];
  const modules = await Promise.all(names.map(async name => ({
    type: 'ESModule', path: path.join(root, name), contents: await readFile(path.join(root, name), 'utf8'),
  })));
  const worker = new Miniflare({
    modules, modulesRoot: root, compatibilityDate: '2026-04-01', compatibilityFlags: ['nodejs_compat'],
    serviceBindings: { ASSETS: () => new Response('Not found', { status: 404 }) },
  });
  context.after(() => worker.dispose());
  const response = await worker.dispatchFetch('http://localhost/', { headers: { accept: 'text/html' } });

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.ok(/<title>GharCart \| Everyday shopping in Pakistan<\/title>/.test(html), 'Storefront title is rendered');
  assert.ok(/<main[\s>]/.test(html), 'Storefront main content is rendered');
  assert.ok(/href="\/product\//.test(html), 'Catalog links are server rendered');
});
