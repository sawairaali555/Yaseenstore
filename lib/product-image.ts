export function productImage(value: string): string {
  // Local uploads must survive changing the development server port or hostname.
  if (/^https?:\/\//.test(value)) {
    try {
      const url = new URL(value);
      if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && url.pathname.startsWith('/api/media/')) {
        return url.pathname + url.search;
      }
    } catch { /* Preserve the original value for the existing fallback below. */ }
  }
  if (/^(https?:\/\/|\/|data:image\/)/.test(value)) return value;
  return `/images/${value}.jpg`;
}
