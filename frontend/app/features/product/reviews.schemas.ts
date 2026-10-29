import { z } from "@/lib/zod"

/** `GET /products/:id/reviews` row (B7). */
export const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  author: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().nullable(),
  body: z.string(), // PLAIN TEXT: rendered as text only, never as HTML
  photos: z.array(z.string()),
  verifiedPurchase: z.boolean(),
  helpfulCount: z.number().int(),
  status: z.enum(["published", "hidden"]),
  edited: z.boolean(),
  isMine: z.boolean(),
  myVote: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Review = z.infer<typeof reviewSchema>

const star = z.number().int().nonnegative()
export const reviewSummarySchema = z.object({
  average: z.number(),
  count: star,
  histogram: z.object({
    "1": star,
    "2": star,
    "3": star,
    "4": star,
    "5": star,
  }),
  withPhotos: star,
})
export type ReviewSummary = z.infer<typeof reviewSummarySchema>

export const eligibilitySchema = z.object({
  canReview: z.boolean(),
  reason: z.enum(["ALREADY_REVIEWED", "OWN_PRODUCT"]).nullable(),
  verifiedPurchase: z.boolean(),
  review: reviewSchema.nullable(),
})
export type Eligibility = z.infer<typeof eligibilitySchema>

export const helpfulResultSchema = z.object({
  helpfulCount: z.number().int(),
  myVote: z.boolean(),
})
export const upvoteResultSchema = z.object({
  upvotes: z.number().int(),
  myVote: z.boolean(),
})

export const answerSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  author: z.string(),
  text: z.string(),
  badge: z.enum(["seller", "staff"]).nullable(),
  verifiedBuyer: z.boolean(),
  upvotes: z.number().int(),
  status: z.enum(["published", "hidden"]),
  isMine: z.boolean(),
  myVote: z.boolean(),
  createdAt: z.string(),
})
export type Answer = z.infer<typeof answerSchema>

export const questionSchema = z.object({
  id: z.string(),
  productId: z.string(),
  author: z.string(),
  text: z.string(),
  upvotes: z.number().int(),
  answerCount: z.number().int(),
  status: z.enum(["published", "hidden"]),
  isMine: z.boolean(),
  myVote: z.boolean(),
  answers: z.array(answerSchema),
  createdAt: z.string(),
})
export type Question = z.infer<typeof questionSchema>

// ---- forms ----

/**
 * The review form (11.6). The rating comes from radio inputs, i.e. the STRING "4":
 * `z.coerce.number()` makes it a number. `title` is optional; `body` 10 to 2000 characters
 * (the server enforces the same). Photos are `File`s here, uploaded before the review is sent.
 */
export const reviewFormSchema = z.object({
  rating: z.coerce
    .number({ error: "Choose a star rating" })
    .int()
    .min(1, { error: "Choose a star rating" })
    .max(5),
  title: z.string().trim().max(120, { error: "At most 120 characters" }),
  body: z
    .string()
    .trim()
    .min(10, { error: "Write at least 10 characters" })
    .max(2000, { error: "At most 2000 characters" }),
})
export type ReviewFormInput = z.input<typeof reviewFormSchema>
export type ReviewFormOutput = z.output<typeof reviewFormSchema>

export const questionFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(10, { error: "Ask a full question (at least 10 characters)" })
    .max(300, { error: "At most 300 characters" }),
})
export const answerFormSchema = z.object({
  text: z
    .string()
    .trim()
    .min(2, { error: "Write an answer" })
    .max(1000, { error: "At most 1000 characters" }),
})
