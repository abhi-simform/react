import { Router } from "express"
import { valid, validate } from "../../middleware/validate.js"
import { ok } from "../../utils/response.js"
import { suggestSchema } from "./search.schema.js"
import * as service from "./search.service.js"

export const searchRoutes = Router()
// Public; the global rate limiter covers abuse. Short cache lets the browser reuse a repeated term.
searchRoutes.get("/suggest", validate(suggestSchema), async (req, res) => {
  const { query } = valid<typeof suggestSchema>(req)
  res.setHeader("Cache-Control", "public, max-age=30")
  ok(res, await service.suggest(query.q, query.limit))
})
