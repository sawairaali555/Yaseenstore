import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import vinext from "vinext";
import { defineConfig } from "vite";

export default defineConfig({
  appType: "custom",
  plugins: [vinext(), tailwindcss(), nitro({ renderer: false })],
  resolve: {
    alias: {
      // Vercel has no Cloudflare Worker bindings. The shim preserves the
      // app's built-in catalog fallback when D1 and R2 are not configured.
      "cloudflare:workers": `${process.cwd()}/build/vercel-cloudflare-workers.ts`,
    },
  },
});
