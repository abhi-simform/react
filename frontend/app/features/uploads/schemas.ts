import { z } from "@/lib/zod"

import { ACCEPTED_IMAGE_TYPES } from "@/lib/imageFiles"

/** `POST /uploads/images` (B7 upload slice) -> 201 data. */
export const uploadedImageSchema = z.object({
  key: z.string(),
  url: z.url(),
  contentType: z.enum(ACCEPTED_IMAGE_TYPES),
  bytes: z.number().int(),
})
export type UploadedImage = z.infer<typeof uploadedImageSchema>
