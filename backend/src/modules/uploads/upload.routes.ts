import express, { Router, type Express } from "express"
import { authenticate } from "../../middleware/auth.js"
import { uploadLimiter } from "../../middleware/rateLimit.js"
import { uploadImage } from "./upload.controller.js"
import { uploadRoot } from "./storage.js"

export const uploadRoutes = Router()
// Auth first: anonymous clients never get to make us parse a multipart body.
uploadRoutes.post("/images", authenticate, uploadLimiter, ...uploadImage)

/** Local adapter only: serve stored files. Cloudinary/S3 would serve their own URLs. */
export function mountUploadFiles(app: Express) {
  app.use(
    "/uploads",
    express.static(uploadRoot(), {
      index: false,
      dotfiles: "deny",
      maxAge: "7d",
      immutable: true, // names are uuids: content never changes under the same URL
      setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
    })
  )
}
