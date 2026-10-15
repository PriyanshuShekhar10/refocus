import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (docs/REFACTOR-PLAN.md, Phase 0).
 *
 *   E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e
 *
 * Public checks always run. Signed-in flows need two dedicated test accounts:
 * E2E_USER_A_EMAIL / E2E_USER_A_PASSWORD and E2E_USER_B_EMAIL / E2E_USER_B_PASSWORD.
 * Without them those tests are skipped. Never point these at real users.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
