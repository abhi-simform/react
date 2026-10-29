// Image `File` rules shared by forms (review photos, avatar, seller images) and the dropzone.
import { z } from "@/lib/zod"

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const MAX_IMAGES = 5
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

/**
 * ONE image `File`: right type, not too big. (`z.instanceof(File)` is the only runtime
 * check that a value really is a File: JSON would turn it into `{}`.) The server checks
 * the real bytes again (`POST /uploads/images` answers 415/413): this is convenience.
 */
export const imageFileSchema = z
  .instanceof(File, { error: "Choose an image file" })
  .refine((f) => (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(f.type), {
    error: (issue) => {
      const file = issue.input as File
      return `${file.name}: only JPEG, PNG or WebP images are accepted`
    },
  })
  .refine((f) => f.size <= MAX_IMAGE_BYTES, {
    error: (issue) => {
      const file = issue.input as File
      return `${file.name} is ${mb(file.size)}; the limit is ${mb(MAX_IMAGE_BYTES)}`
    },
  })

export const imageFilesSchema = z
  .array(imageFileSchema)
  .max(MAX_IMAGES, { error: `Add at most ${MAX_IMAGES} images` })

/** First problem with one file, or `null`: used by the dropzone to say WHY a file was not added. */
export function imageFileProblem(file: File): string | null {
  const result = imageFileSchema.safeParse(file)
  return result.success
    ? null
    : (result.error.issues[0]?.message ?? "Invalid image")
}
