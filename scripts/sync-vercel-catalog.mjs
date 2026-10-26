import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const origin = process.env.STOREFRONT_SNAPSHOT_ORIGIN || "http://127.0.0.1:5173";
const root = process.cwd();
const response = await fetch(new URL("/api/storefront", origin));
if (!response.ok) throw new Error(`Storefront API returned ${response.status}`);

const snapshot = await response.json();
for (const product of snapshot.products || []) {
  if (!product.image?.startsWith("/api/media/")) continue;

  const media = await fetch(new URL(product.image, origin));
  if (!media.ok) throw new Error(`Could not fetch image for ${product.id}: ${media.status}`);
  const contentType = media.headers.get("content-type") || "image/jpeg";
  const extension = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const filename = `${product.id}.${extension}`;
  const outputDirectory = path.join(root, "public", "images", "storefront");
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, filename), Buffer.from(await media.arrayBuffer()));
  product.image = `/images/storefront/${filename}`;
}

await writeFile(
  path.join(root, "data", "vercel-storefront-snapshot.json"),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log(`Synced ${snapshot.products?.length || 0} public storefront products.`);
