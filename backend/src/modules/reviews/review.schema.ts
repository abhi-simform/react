import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const productParam = z.object({ productId: objectId })
const page = {
  page: z.coerce.number().int().min(1).default(1),
}

export const photoList = z.array(z.url().max(300)).max(5, "At most 5 photos")

export const listReviewsSchema = {
  params: productParam,
  query: z.object({
    ...page,
    limit: z.coerce.number().int().min(1).max(30).default(10),
    sort: z.enum(["helpful", "newest", "highest", "lowest"]).default("helpful"),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    photos: z.enum(["true", "false"]).optional(),
  }),
}
export const productIdSchema = { params: productParam }

export const createReviewSchema = {
  params: productParam,
  body: z.object({
    rating: z.number().int().min(1).max(5),
    title: z.string().trim().max(120).optional(),
    body: z
      .string()
      .trim()
      .min(10, "Tell us a little more (at least 10 characters)")
      .max(2000),
    photos: photoList.default([]),
  }),
}
export const updateReviewSchema = {
  params: z.object({ id: objectId }),
  body: z
    .object({
      rating: z.number().int().min(1).max(5),
      title: z.string().trim().max(120),
      body: z.string().trim().min(10).max(2000),
      photos: photoList,
    })
    .partial()
    .refine((v) => Object.keys(v).length > 0, "Send at least one field"),
}
export const reviewIdSchema = { params: z.object({ id: objectId }) }
export const reportSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ reason: z.string().trim().min(3).max(200) }),
}

export const adminListReviewsSchema = {
  query: z.object({
    ...page,
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(["published", "hidden"]).optional(),
    productId: objectId.optional(),
    reported: z.enum(["true", "false"]).optional(),
  }),
}
export const moderateSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(["published", "hidden"]),
    note: z.string().trim().max(300).optional(),
  }),
}

// ---- Q&A ----
export const listQuestionsSchema = {
  params: productParam,
  query: z.object({
    ...page,
    limit: z.coerce.number().int().min(1).max(20).default(5),
    sort: z.enum(["helpful", "newest"]).default("helpful"),
  }),
}
export const askSchema = {
  params: productParam,
  body: z.object({
    text: z
      .string()
      .trim()
      .min(10, "Ask a full question (at least 10 characters)")
      .max(300),
  }),
}
export const listAnswersSchema = {
  params: z.object({ id: objectId }),
  query: z.object({ ...page, limit: z.coerce.number().int().min(1).max(30).default(10) }),
}
export const answerSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ text: z.string().trim().min(2).max(1000) }),
}
export const adminListQuestionsSchema = {
  query: z.object({
    ...page,
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(["published", "hidden"]).optional(),
    unanswered: z.enum(["true", "false"]).optional(),
  }),
}
