import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Root Vitest config for the monorepo. Tests live next to the code they cover
 * (packages/**, apps/web/src/**). Path aliases mirror the app's workspace
 * imports so `@poolops/*` resolves to TypeScript source.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@poolops/shared": resolve(__dirname, "packages/shared/src/index.ts"),
      "@poolops/scheduling": resolve(__dirname, "packages/scheduling/src/index.ts"),
      "@poolops/supabase": resolve(__dirname, "packages/supabase/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: [
      "packages/**/*.test.ts",
      "apps/web/src/lib/**/*.test.ts",
    ],
  },
});
