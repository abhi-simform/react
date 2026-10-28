/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  /** Optional: minutes of inactivity before the "still there?" dialog (default 30). */
  readonly VITE_IDLE_MINUTES?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
