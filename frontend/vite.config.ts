import babel from "@rolldown/plugin-babel"
import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { reactCompilerPreset } from "@vitejs/plugin-react"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import { visualizer } from "rollup-plugin-visualizer"
import { defineConfig, loadEnv, type Plugin } from "vite"

// React Router builds twice (client + SPA server shell): measure the CLIENT bundle only.
const clientOnly = (plugin: Plugin): Plugin => ({
  ...plugin,
  applyToEnvironment: (environment) => environment.name === "client",
})

// 14.6: source maps are produced ONLY when a build is going to upload them to Sentry (SENTRY_AUTH_TOKEN is set, by CI or
// the host's build environment; never VITE_-prefixed, so it cannot reach the bundle). `hidden` = the maps exist but the
// files carry no `//# sourceMappingURL` comment, and the plugin deletes the maps after the upload: nothing public.
// Without a token the build is exactly what it was before: no maps, no upload, no network access.
const uploadMaps = Boolean(process.env.SENTRY_AUTH_TOKEN)
const sentryPlugins = uploadMaps
  ? [
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        // Must equal VITE_RELEASE (the SDK's `release`), or Sentry cannot match events to maps.
        release: { name: process.env.VITE_RELEASE },
        sourcemaps: {
          // Deleted even when the upload FAILED: a map must never end up on the public host.
          // SENTRY_KEEP_MAPS=1 exists only for scripts/verify-sentry.mjs (it symbolicates a stack itself).
          filesToDeleteAfterUpload: process.env.SENTRY_KEEP_MAPS
            ? []
            : ["build/client/**/*.map"],
        },
        telemetry: false,
        // A self-hosted / regional Sentry (https://de.sentry.io) or, in scripts/verify-sentry.mjs, a local mock.
        url: process.env.SENTRY_URL,
        // A failed upload must fail a CI build (a release without maps is unreadable); locally it only warns.
        errorHandler: (err) => {
          if (process.env.CI) throw err
          console.warn(`[sentry] source map upload failed: ${err.message}`)
        },
      }),
    ]
      .flat()
      .map(clientOnly)
  : []

// 14.6: a COMPILE-TIME constant, so that a build without a DSN does not contain the Sentry SDK at all (the dynamic
// `import("./sentry")` sits behind `if (__SENTRY_ENABLED__)`, which the bundler folds to `if (false)` and drops).
// `env.SENTRY_DSN` alone could not do that: it is a runtime value to the bundler.
const sentryEnabled = Boolean(
  process.env.VITE_SENTRY_DSN ||
  loadEnv("production", process.cwd(), "VITE_").VITE_SENTRY_DSN
)

export default defineConfig({
  define: { __SENTRY_ENABLED__: JSON.stringify(sentryEnabled) },
  resolve: { tsconfigPaths: true },
  build: { sourcemap: uploadMaps ? "hidden" : false },
  plugins: [
    tailwindcss(),
    reactRouter(),
    ...sentryPlugins,
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
