import { setupServer } from "msw/node"

export const API = "http://localhost:4000/api/v1"
/** The envelope every success response uses: `{ success: true, data, meta? }`. */
export const ok = <T>(data: T, meta?: object) => ({
  success: true,
  data,
  ...(meta ? { meta } : {}),
})
/** The envelope of an error: `{ success: false, error: { code, message, details? } }`. */
export const fail = (code: string, message: string, details?: unknown) => ({
  success: false,
  error: { code, message, ...(details ? { details } : {}) },
})

// No default handlers: every test declares the endpoints it uses, and `onUnhandledFrame: "error"`
// (setup.ts) turns a forgotten one into a failing test instead of a silent network call.
export const server = setupServer()
