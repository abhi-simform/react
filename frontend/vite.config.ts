import babel from "@rolldown/plugin-babel"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { reactCompilerPreset } from "@vitejs/plugin-react"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig, type Plugin } from "vite"

// React Router builds twice (client + SPA server shell): measure the CLIENT bundle only.
const clientOnly = (plugin: Plugin): Plugin => ({
  ...plugin,
  applyToEnvironment: (environment) => environment.name === "client",
})

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    reactRouter(),
    // 13.2: React Compiler (build-time auto-memoization). Runs on .tsx/.jsx only.
    babel({ presets: [reactCompilerPreset()] }),
    // 13.3: `ANALYZE=1 npm run build` writes build/stats.html (treemap) and build/stats.json (raw data
    // with gzip sizes, read by scripts/perf/deps.mjs). Off by default: no cost in a normal build.
    ...(process.env.ANALYZE
      ? [
          clientOnly(
            visualizer({
              filename: "build/stats.html",
              template: "treemap",
              gzipSize: true,
            })
          ),
          clientOnly(
            visualizer({
              filename: "build/stats.json",
              template: "raw-data",
              gzipSize: true,
            })
          ),
        ]
      : []),
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
