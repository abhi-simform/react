import { createStart } from "@tanstack/react-start"

// A.0: render pages in the browser only. The server still sends the HTML document shell
// (root `shellComponent`: <html>, <head>, <body>, scripts) but NOT the page content: the access
// token lives in browser memory, so there is nothing useful for a server to render.
// Per-route override: `createFileRoute(...)({ ssr: true })`.
export const startInstance = createStart(() => ({
  defaultSsr: false,
}))
