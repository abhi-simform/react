import type { Config } from "@react-router/dev/config"

export default {
  // SPA mode (client-side rendering). Set to true to enable server-side rendering (see learning-plan.md, final stage)
  ssr: false,
  // 13.9: static routes rendered to HTML at build time (their <head> tags are in the file crawlers fetch).
  prerender: [
    "/",
    "/help",
    "/deals",
    "/policies/privacy",
    "/policies/returns",
    "/policies/terms",
  ],
} satisfies Config
