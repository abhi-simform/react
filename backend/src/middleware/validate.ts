import type { Request, RequestHandler } from "express"
import { z } from "zod"
import { ApiError } from "../utils/ApiError.js"

interface Schemas {
  body?: z.ZodType
  query?: z.ZodType
  params?: z.ZodType
}

/**
 * Validate request parts with Zod. Results land on `req.valid` (Express 5 makes `req.query`
 * read-only, so we don't overwrite it). Because Zod strips unknown keys and enforces types,
 * this also blocks NoSQL-injection payloads like { "email": { "$ne": null } }.
 */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    const issues: { in: string; path: string; message: string }[] = []
    const valid: Record<string, unknown> = {}
    for (const part of ["body", "query", "params"] as const) {
      const schema = schemas[part]
      if (!schema) continue
      const result = schema.safeParse(req[part])
      if (result.success) valid[part] = result.data
      else
        for (const i of result.error.issues)
          issues.push({ in: part, path: i.path.join("."), message: i.message })
    }
    if (issues.length)
      return next(new ApiError(422, "VALIDATION_ERROR", "Validation failed", issues))
    req.valid = { body: undefined, query: undefined, params: undefined, ...valid }
    next()
  }

/** Typed accessor for validated input: `const { body } = valid<typeof schemas>(req)` */
export function valid<S extends Schemas>(req: Request) {
  return req.valid as {
    body: S["body"] extends z.ZodType ? z.output<S["body"]> : undefined
    query: S["query"] extends z.ZodType ? z.output<S["query"]> : undefined
    params: S["params"] extends z.ZodType ? z.output<S["params"]> : undefined
  }
}
