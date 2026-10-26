import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = process.env.STOREFRONT_SNAPSHOT_ORIGIN || "http://127.0.0.1:5173";
const root = process.cwd();
const response = await fetch(new URL("/api/storefront", origin));
if (!response.ok) throw new Error(`Storefront API returned ${response.status}`);

const snapshot = await response.json();
if (!Array.isArray(snapshot.catalog) || !snapshot.settings) {
  throw new Error('The local storefront must provide its full public catalog and settings.');
}
const downloaded = new Map();
async function portableValue(value) {
  if (Array.isArray(value)) return Promise.all(value.map(portableValue));
  if (value && typeof value === 'object') {
    return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await portableValue(item)])));
  }
  if (typeof value !== 'string') return value;
  let url;
  try { url = new URL(value, origin); } catch { return value; }
  if (!url.pathname.startsWith('/api/media/')) return value;
  if (!downloaded.has(url.pathname)) downloaded.set(url.pathname, downloadMedia(url));
  return downloaded.get(url.pathname);
}
async function downloadMedia(url) {
  const media = await fetch(new URL(url.pathname, origin));
  if (!media.ok) throw new Error(`Could not fetch ${url.pathname}: ${media.status}`);
  const contentType = media.headers.get("content-type") || "image/jpeg";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${path.basename(url.pathname).replace(/[^a-zA-Z0-9_-]/g, '_')}.${extension}`;
  const outputDirectory = path.join(root, "public", "images", "storefront");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, filename), Buffer.from(await media.arrayBuffer()));
  return `/images/storefront/${filename}`;
}
const portableSnapshot = await portableValue(snapshot);
await writeFile(
  path.join(root, "data", "vercel-storefront-snapshot.json"),
  `${JSON.stringify(portableSnapshot, null, 2)}\n`,
);
console.log(`Synced ${snapshot.catalog.length} public catalog products, store settings and categories.`);
