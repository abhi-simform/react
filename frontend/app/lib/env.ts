// Fail fast at startup: a missing URL would otherwise become "undefined/health".
const apiUrl = import.meta.env.VITE_API_URL

if (!apiUrl) {
  throw new Error(
    "VITE_API_URL is missing. Copy .env.example to .env.local and restart the dev server."
  )
}

export const env = {
  VITE_API_URL: apiUrl.replace(/\/$/, ""),
  /** true under `vite dev`, false in a production build */
  DEV: import.meta.env.DEV,
  /** 14.6: empty string = error tracking off. Read as a literal so the bundler can drop the Sentry chunk. */
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN ?? "",
  RELEASE: import.meta.env.VITE_RELEASE ?? "",
  ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT ?? import.meta.env.MODE,
  TRACES_SAMPLE_RATE:
    Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0) || 0,
} as const
