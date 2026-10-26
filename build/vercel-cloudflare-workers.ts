// Vercel deployment shim: public pages fall back to the built-in catalog
// when Cloudflare D1/R2 bindings are unavailable.
export const env = {
  DB: null,
  BUCKET: null,
};
