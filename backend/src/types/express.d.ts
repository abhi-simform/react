import type { Role } from "../config/constants.js"

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate` */
      user?: { id: string; role: Role }
      /** Set by `validate` — the parsed + coerced body/query/params */
      valid: { body: unknown; query: unknown; params: unknown }
      /** Exact bytes of the payment webhook body (its signature covers them) */
      rawBody?: Buffer
      /** Set by the cart module's `cartOwner`: the user or guest whose cart this request touches */
      cartOwner?: { userId: string } | { guestToken: string }
    }
  }
}
export {}
