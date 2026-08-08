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
    // Emit `about.html` (served at `/about`) instead of `about/index.html`
    // so URLs avoid trailing-slash 308 redirects on Cloudflare Pages.
    format: "file",
  },
  integrations: [react()],
});
