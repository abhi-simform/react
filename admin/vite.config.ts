import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart({
      // A.8: emit a static SPA shell (dist/client/_shell.html) so the console deploys as plain files behind
      // nginx (no Node server): the access token lives in browser memory, there is nothing to server-render.
      spa: { enabled: true },
    }),
    viteReact(),
  ],
})

export default config
