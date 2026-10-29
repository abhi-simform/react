/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Optional: minutes of inactivity before the "still there?" dialog (default 30). */
  readonly VITE_IDLE_MINUTES?: string
  /** Public origin of the site (canonical URLs, Open Graph, sitemap). Default http://localhost:5173. */
  readonly VITE_SITE_URL?: string
  /** 14.6: Sentry DSN (public by design). Empty = error tracking is OFF and its code is not even in the bundle. */
  readonly VITE_SENTRY_DSN?: string
  /** 14.6: the release name events are tagged with (the git SHA); must equal the release the source maps were uploaded to. */
  readonly VITE_RELEASE?: string
  /** 14.6: `production` / `staging`; falls back to the Vite mode. */
  readonly VITE_ENVIRONMENT?: string
  /** 14.6: 0..1, share of page loads/navigations traced (default 0 = no tracing). */
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string
}

/** Injected by vite.config.ts: true only when the build has a VITE_SENTRY_DSN (see lib/observability.ts). */
declare const __SENTRY_ENABLED__: boolean

interface ImportMeta {
  readonly env: ImportMetaEnv
}
