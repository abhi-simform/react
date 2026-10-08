import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    setupFiles: ["tests/setup.ts"],
    // One shared in-memory Mongo; run files serially so they don't clobber each other.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
})
