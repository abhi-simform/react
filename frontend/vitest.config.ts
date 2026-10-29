import path from "node:path"

import { defineConfig } from "vitest/config"

// Stage 12.1: a dedicated config. The React Router plugin (SSR build, route
// typegen) has no business in a test run, so tests only get the `@` alias.
export default defineConfig({
  // The Sentry SDK is imported behind this flag (lib/observability.ts); tests mock the module and decide by `env.SENTRY_DSN`.
  define: { __SENTRY_ENABLED__: true },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "app") } },
  test: {
    globals: true,
    css: false,
    restoreMocks: true,
    exclude: ["e2e/**", "node_modules/**"],
    env: { VITE_API_URL: "http://localhost:4000/api/v1" },
    // Two projects (12.1/12.4): pure-logic tests get a light jsdom setup; everything that renders,
    // or talks to the fake network, also loads MSW + the fixture database (the slow part).
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["app/**/*.test.ts"],
          exclude: ["app/test/msw/**", "app/test/network/**"],
          setupFiles: ["./app/test/setup.unit.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: [
            "app/**/*.test.tsx",
            "app/test/msw/**/*.test.ts",
            "app/test/network/**/*.test.ts",
          ],
          setupFiles: ["./app/test/setup.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text", "html"],
      // The pure-logic folders: money, filters, status rules, schemas, reducers.
      include: [
        "app/lib/{format,duration,async,asyncState,pageTitle,indiaStates,groupBy,immutable,imageFiles,safeUrl}.ts",
        "app/lib/api/{query,errors}.ts",
        "app/features/cart/{totals,lines,coupon}.ts",
        "app/features/catalog/{filters,utils}.ts",
        "app/features/orders/{status,idempotency}.ts",
        "app/features/auth/{returnTo,schemas}.ts",
        "app/features/account/schemas.ts",
        "app/features/checkout/{totals,steps,slots,stepperReducer,schemas}.ts",
        "app/features/product/reviewFilters.ts",
        "app/features/delivery/format.ts",
      ],
      exclude: ["app/**/*.test.*"],
    },
  },
})
