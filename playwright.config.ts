import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the end-to-end critical-path smoke test.
 *
 * Targets a RUNNING instance at E2E_BASE_URL (with Villas seeded + an admin
 * provisioned). The spec skips itself when the required env vars are unset, so
 * `npm run e2e` never fails in an unconfigured environment. To run for real:
 *
 *   npx playwright install
 *   E2E_BASE_URL=http://localhost:3000 E2E_ADMIN_EMAIL=… E2E_ADMIN_PASSWORD=… npm run e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
