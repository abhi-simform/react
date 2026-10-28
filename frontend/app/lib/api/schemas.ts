import { z } from "zod"

export const pageMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
})

/** Success envelope around any data schema: `{ success: true, data, meta? }`. */
export function apiEnvelopeSchema<T extends z.ZodType>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: pageMetaSchema.optional(),
  })
}

/** List envelope: `data` is an array of `itemSchema`, `meta` is required. */
export function paginatedSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: pageMetaSchema,
  })
}

/** Like `paginatedSchema`, but `meta` is a custom schema (e.g. page meta + facets). */
export function paginatedWithMetaSchema<
  T extends z.ZodType,
  M extends z.ZodType,
>(itemSchema: T, metaSchema: M) {
  return z.object({
    success: z.literal(true),
    data: z.array(itemSchema),
    meta: metaSchema,
  })
}
