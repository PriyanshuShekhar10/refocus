// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// Static output for Cloudflare Pages. The logged-in -> dashboard redirect is
// handled by a Cloudflare Pages Function in `functions/_middleware.ts`.
export default defineConfig({
  site: "https://refocus.co.in",
  output: "static",
  trailingSlash: "never",
  build: {
    // Emit `career.html` (served at `/career`) instead of `career/index.html`
    // so URLs match the Next app and avoid trailing-slash 308 redirects.
    format: "file",
  },
  integrations: [react()],
});
