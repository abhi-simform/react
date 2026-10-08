import { z } from "zod"

const csv = z.string().transform((v) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
)

const bool = z.enum(["true", "false"]).transform((v) => v === "true")

export const SORTS = [
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "rating",
  "discount",
  "popularity",
] as const

export const listProductsSchema = {
  query: z
    .object({
      search: z.string().trim().min(1).max(100).optional(),
      category: z.string().trim().optional(), // category slug; includes all sub-categories
      brand: csv.optional(), // ?brand=Apple,Samsung
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      minRating: z.coerce.number().min(0).max(5).optional(),
      minDiscount: z.coerce.number().min(0).max(100).optional(),
      inStock: bool.optional(),
      featured: bool.optional(),
      sort: z.enum(SORTS).default("relevance"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(60).default(20),
    })
    .refine((q) => q.minPrice == null || q.maxPrice == null || q.minPrice <= q.maxPrice, {
      message: "minPrice must be <= maxPrice",
      path: ["minPrice"],
    }),
}

export const getProductSchema = { params: z.object({ idOrSlug: z.string().min(1) }) }
