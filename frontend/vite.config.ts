import babel from "@rolldown/plugin-babel"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { reactCompilerPreset } from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    reactRouter(),
    // 13.2: React Compiler (build-time auto-memoization). Runs on .tsx/.jsx only.
    babel({ presets: [reactCompilerPreset()] }),
  ],
  // Playwright writes traces and reports under e2e/: a change there made the dev server reload
  // the page in the middle of a test.
  server: {
    watch: {
      ignored: [
        "**/e2e/.results/**",
        "**/playwright-report/**",
        "**/coverage/**",
      ],
    },
  },
})
