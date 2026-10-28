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
} as const
