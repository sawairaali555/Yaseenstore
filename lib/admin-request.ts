export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const timeout = AbortSignal.timeout(30000);
  try {
    if (typeof window !== 'undefined' && typeof input === 'string' && input.startsWith('/api/')) {
      const tenant = new URLSearchParams(window.location.search).get('tenant');
      if (tenant) input += (input.includes('?') ? '&' : '?') + `tenant=${encodeURIComponent(tenant)}`;
    }
    const response = await fetch(input, {
      ...init,
      cache: 'no-store',
      signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (response.status === 401 || response.redirected) throw new Error('Your session expired. Sign in again.');
      throw new Error('The server returned an unexpected response. Refresh and try again.');
    }
    return response;
  } catch (error) {
    if (timeout.aborted) throw new Error('The request timed out. Refresh to check whether changes were saved before trying again.');
    if (error instanceof TypeError) throw new Error('Unable to reach the server. Check your connection and try again.');
    throw error;
  }
}

export async function uploadAdminImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (!file.size || file.size > 3 * 1024 * 1024) throw new Error('Images must be between 1 byte and 3 MB.');
  const response = await adminFetch('/api/media', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
  const data = await response.json() as { url?: string; error?: string };
  if (!response.ok || typeof data.url !== 'string') throw new Error(data.error || 'Image could not be uploaded.');
  return data.url as string;
}
