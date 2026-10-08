import type { ErrorRequestHandler } from "express"
import mongoose from "mongoose"
import { isProd } from "../config/env.js"
import { logger } from "../config/logger.js"
import { ApiError } from "../utils/ApiError.js"

// Single place where every error becomes the standard envelope:
// { success: false, error: { code, message, details? } }
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let apiError: ApiError

  if (err instanceof ApiError) {
    apiError = err
  } else if (err instanceof mongoose.Error.ValidationError) {
    apiError = new ApiError(
      422,
      "VALIDATION_ERROR",
      "Validation failed",
      Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }))
    )
  } else if (err instanceof mongoose.Error.CastError) {
    apiError = ApiError.badRequest(`Invalid ${err.path}: ${String(err.value)}`)
  } else if (err?.code === 11000) {
    const field = Object.keys(err.keyPattern ?? {})[0] ?? "field"
    apiError = ApiError.conflict(`${field} already exists`, "DUPLICATE_KEY")
  } else if (err?.type === "entity.parse.failed") {
    apiError = ApiError.badRequest("Malformed JSON body")
  } else if (err?.type === "entity.too.large") {
    apiError = new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body too large")
  } else {
    apiError = new ApiError(500, "INTERNAL_ERROR", "Something went wrong")
    logger.error({ err, reqId: req.id }, "Unhandled error")
  }

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details ? { details: apiError.details } : {}),
      ...(!isProd && apiError.statusCode === 500 ? { stack: err?.stack } : {}),
    },
  })
}
