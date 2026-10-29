import { supabaseDatabase } from './supabase-database';
import { supabaseStorage } from './supabase-storage';

// Keep the existing Cloudflare deployment intact; only Vercel resolves this shim.
export const env = {
  get DB() { return supabaseDatabase(); },
  get BUCKET() { return supabaseStorage(); },
  get ADMIN_MFA_KEY() { return process.env.ADMIN_MFA_KEY; },
};
