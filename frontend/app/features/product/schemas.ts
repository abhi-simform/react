import { z } from "zod"

import { imageFilesSchema } from "@/lib/imageFiles"

/**
 * The review form (7.2). The rating comes from radio inputs, i.e. the STRING "4":
 * `z.coerce.number()` turns it into 4, so `z.input` (`unknown`) and `z.output` (`number`)
 * differ, and `handleSubmit` receives the number.
 */
export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Choose a star rating" })
    .int()
    .min(1, { error: "Choose a star rating" })
    .max(5),
  text: z
    .string()
    .trim()
    .min(20, { error: "Write at least 20 characters" })
    .max(500, { error: "At most 500 characters" }),
  /** Real `File` objects, validated by type and size (7.8). Uploading them waits for the reviews API (Stage 11). */
  photos: imageFilesSchema,
})
export type ReviewInput = z.input<typeof reviewSchema>
export type ReviewOutput = z.output<typeof reviewSchema>
