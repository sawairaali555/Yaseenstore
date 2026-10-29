// Server-only R2-shaped facade for private Supabase Storage objects.
export function supabaseStorage(): R2Bucket | null {
  const origin = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!origin || !key) return null;
  const base = new URL('/storage/v1/object/yaseenstore-media/', origin);
  const url = (path: string) => new URL(path.split('/').map(encodeURIComponent).join('/'), base);
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  return {
    async put(path: string, bytes: Uint8Array, options: { httpMetadata?: { contentType?: string } }) {
      const response = await fetch(url(path), {
        method: 'POST', headers: { ...headers, 'Content-Type': options?.httpMetadata?.contentType || 'application/octet-stream' },
        body: bytes as BodyInit, signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`Image upload failed (${response.status})`);
      return {};
    },
    async get(path: string) {
      const response = await fetch(url(path), { headers, signal: AbortSignal.timeout(15000), cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Image read failed (${response.status})`);
      return { body: response.body, httpMetadata: { contentType: response.headers.get('Content-Type') || 'application/octet-stream' } };
    },
  } as unknown as R2Bucket;
}
