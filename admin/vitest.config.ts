import { defineConfig } from "vitest/config"
import viteReact from "@vitejs/plugin-react"

// A dedicated config: the app's vite.config.ts loads the TanStack Start and devtools plugins, which a
// unit-test run does not want. Only the alias (`@/`) and React's JSX transform are needed here.
export default defineConfig({
  plugins: [viteReact()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    globals: false,
    include: ["src/**/*.test.{ts,tsx}"],
    env: { VITE_API_URL: "http://localhost:4000/api/v1" },
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/routeTree.gen.ts", "src/test/**", "src/components/ui/**"],
    },
  },
})
