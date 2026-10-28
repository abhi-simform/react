import { z } from "zod"

export const PRODUCT_SORTS = [
  "relevance",
  "price_asc",
  "price_desc",
  "newest",
  "rating",
  "discount",
  "popularity",
] as const

export const productSortSchema = z.enum(PRODUCT_SORTS)
export const productStatusSchema = z.enum(["active", "draft", "archived"])

const categoryRefSchema = z.object({
  _id: z.string(),
  name: z.string(),
  slug: z.string(),
})

/** A product as returned in LISTS (`GET /products`). Unknown keys (like `__v`) are stripped. */
export const productSchema = z.object({
  _id: z.string(),
  name: z.string().min(1),
  slug: z.string().min(1),
  brand: z.string(),
  category: categoryRefSchema,
  categoryPath: z.array(z.string()),
  tags: z.array(z.string()),
  price: z.number().nonnegative(),
  mrp: z.number().nonnegative(),
  discountPercent: z.number().min(0).max(100),
  images: z.array(z.object({ url: z.url(), alt: z.string().optional() })),
  stock: z.number().int().nonnegative(),
  sku: z.string(),
  ratingAvg: z.number().min(0).max(5),
  ratingCount: z.number().int().nonnegative(),
  soldCount: z.number().int().nonnegative(),
  isFeatured: z.boolean(),
  status: productStatusSchema,
  seller: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

/** `GET /products/:idOrSlug`: list fields + long-form fields, with `categoryPath` expanded. */
export const productDetailSchema = productSchema
  .omit({ categoryPath: true })
  .extend({
    description: z.string(),
    highlights: z.array(z.string()),
    specs: z.array(z.object({ key: z.string(), value: z.string() })),
    categoryPath: z.array(categoryRefSchema),
  })

// The types come ONLY from the schemas: they cannot drift from the runtime check.
export type Product = z.infer<typeof productSchema>
export type ProductDetail = z.infer<typeof productDetailSchema>
export type ProductStatus = z.infer<typeof productStatusSchema>
export type ProductSort = z.infer<typeof productSortSchema>

// ---- query strings --------------------------------------------------------

/**
 * Query strings are always strings, so numbers need coercion. PITFALL:
 * `z.coerce.number()` runs `Number(input)`, and `Number("")` is `0`, so an
 * empty `?minPrice=` silently becomes "minimum price 0" instead of "absent".
 * `queryNumber` turns "" into undefined BEFORE coercing. Put `.optional()` /
 * `.default()` INSIDE it, otherwise the undefined reaches the coercion and
 * becomes NaN.
 */
const queryNumber = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema)

const csv = z.string().transform((v) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
)

export const productQuerySchema = z.object({
  page: queryNumber(z.coerce.number().int().min(1).default(1)),
  limit: queryNumber(z.coerce.number().int().min(1).max(60).default(20)),
  sort: productSortSchema.default("relevance"),
  search: z.string().trim().min(1).optional(),
  category: z.string().optional(),
  brand: csv.optional(), // input "Apple,boAt" -> output ["Apple", "boAt"]
  minPrice: queryNumber(z.coerce.number().min(0).optional()),
  maxPrice: queryNumber(z.coerce.number().min(0).optional()),
  minRating: queryNumber(z.coerce.number().min(0).max(5).optional()),
  minDiscount: queryNumber(z.coerce.number().min(0).max(100).optional()),
})

/** What `getProducts` accepts: parsed values, all optional. (`z.input` would be the raw strings.) */
export type ProductQuery = Partial<z.infer<typeof productQuerySchema>> & {
  inStock?: boolean
}

/** Same coercion WITHOUT the guard, kept to demonstrate the "" -> 0 pitfall. */
export const naiveMinPriceSchema = z.coerce.number().min(0).optional()
