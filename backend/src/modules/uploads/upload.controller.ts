import type { RequestHandler } from "express"
import multer from "multer"
import { env } from "../../config/env.js"
import { ApiError } from "../../utils/ApiError.js"
import { created } from "../../utils/response.js"
import { sniffImage } from "./sniff.js"
import { getStorage } from "./storage.js"

// Memory storage is fine at 2 MB per request; bytes are checked BEFORE anything touches the disk.
const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1, fields: 0 },
}).single("file")

/** Runs multer and turns its errors into our standard ApiError envelope. */
const parseMultipart: RequestHandler = (req, res, next) => {
  parser(req, res, (err: unknown) => {
    if (!err) return next()
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE")
        return next(
          new ApiError(
            413,
            "FILE_TOO_LARGE",
            `Image is too large (max ${Math.round(env.UPLOAD_MAX_BYTES / 1024 / 1024)} MB)`
          )
        )
      return next(
        new ApiError(422, "VALIDATION_ERROR", "Invalid upload", [
          {
            in: "body",
            path: "file",
            message: `Send exactly one image in the "file" field`,
          },
        ])
      )
    }
    next(err)
  })
}

const saveImage: RequestHandler = async (req, res) => {
  const file = req.file
  if (!file)
    throw new ApiError(422, "VALIDATION_ERROR", "Validation failed", [
      {
        in: "body",
        path: "file",
        message: 'Attach an image in the multipart field "file"',
      },
    ])
  const type = sniffImage(file.buffer)
  if (!type)
    throw new ApiError(
      415,
      "UNSUPPORTED_FILE_TYPE",
      "Only JPEG, PNG and WebP images are accepted"
    )
  const stored = await getStorage().save({
    buffer: file.buffer,
    type,
    ownerId: req.user!.id,
    baseUrl: `${req.protocol}://${req.get("host")}`,
  })
  created(res, stored)
}

export const uploadImage: RequestHandler[] = [parseMultipart, saveImage]
