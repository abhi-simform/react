/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Optional: minutes of inactivity before the "still there?" dialog (default 30). */
  readonly VITE_IDLE_MINUTES?: string
  /** Public origin of the site (canonical URLs, Open Graph, sitemap). Default http://localhost:5173. */
  readonly VITE_SITE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
