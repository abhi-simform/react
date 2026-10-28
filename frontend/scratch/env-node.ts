// Scratch-only stand-in for app/lib/env.ts (Node has no import.meta.env).
// alias-hooks.mjs resolves "@/lib/env" to this file.
export const env = {
  VITE_API_URL: process.env.VITE_API_URL ?? "http://localhost:4000/api/v1",
  DEV: true,
} as const
