import { z } from "zod"

export const getCategorySchema = { params: z.object({ slug: z.string().trim().min(1) }) }

export const listBrandsSchema = {
  query: z.object({
    category: z.string().trim().min(1).optional(), // category slug; includes sub-categories
  }),
}
