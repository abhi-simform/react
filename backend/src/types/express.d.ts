import type { Role } from "../config/constants.js"

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` */
      user?: { id: string; role: Role }
      /** Set by `validate` — the parsed + coerced body/query/params */
      valid: { body: unknown; query: unknown; params: unknown }
    }
  }
}
export {}
