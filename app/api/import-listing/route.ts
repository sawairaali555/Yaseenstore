import { actor, body, fail, origin } from '@/lib/access/server';

const reply = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

function attribute(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'));
  return match?.[1]?.trim() || '';
}

function clean(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function productFromJsonLd(html: string) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidates = Array.isArray(parsed) ? parsed : [parsed, ...(Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [])];
      const product = candidates.find((item: any) => {
        const type = item?.['@type'];
        return type === 'Product' || (Array.isArray(type) && type.includes('Product'));
      });
      if (product) return product;
    } catch {
      // Ignore malformed JSON-LD and continue with Open Graph metadata.
    }
  }
  return null;
}

function isPublicUrl(url: URL) {
  if (!['http:', 'https:'].includes(url.protocol)) return false;
  const host = url.hostname.toLowerCase();
  return host !== 'localhost' && host !== '127.0.0.1' && host !== '::1' &&
    !host.startsWith('10.') && !host.startsWith('192.168.') &&
    !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host) && !host.endsWith('.local');
}

export async function POST(req: Request) {
  try {
    origin(req);
    await actor('content.edit');
    const input = await body(req, 12000) as { url?: string };
    const url = new URL(String(input.url || '').trim());
    if (!isPublicUrl(url)) return reply({ error: 'Enter a public http:// or https:// product link.' }, 400);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Cartify Listing Importer/1.0' },
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) return reply({ error: `The product page returned HTTP ${response.status}.` }, 422);
    const html = (await response.text()).slice(0, 2_000_000);
    const structured = productFromJsonLd(html) as any;
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const structuredImage = Array.isArray(structured?.image) ? structured.image[0] : structured?.image;
    const rawImage = String(structuredImage || attribute(html, 'og:image') || '').trim();
    const image = rawImage ? new URL(rawImage, url).toString() : '';
    const title = clean(String(structured?.name || attribute(html, 'og:title') || titleMatch?.[1] || '')).slice(0, 150);
    const description = clean(String(structured?.description || attribute(html, 'og:description') || attribute(html, 'description') || '')).slice(0, 1000);
    const structuredPrice = structured?.offers?.price || structured?.offers?.lowPrice || (Array.isArray(structured?.offers) ? structured.offers[0]?.price : '');
    const price = String(structuredPrice || attribute(html, 'product:price:amount') || (html.match(/"price"\s*:\s*"?([0-9]+(?:\.[0-9]+)?)/i)?.[1] || '')).trim();
    if (!title && !image) return reply({ error: 'No product title or image was found on that page.' }, 422);
    return reply({ sourceUrl: url.toString(), name: title, description, image, images: image ? [image] : [], price });
  } catch (error) {
    return fail(error);
  }
}
