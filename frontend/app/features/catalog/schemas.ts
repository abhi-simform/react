import { z } from "zod"

import { pageMetaSchema } from "@/lib/api/schemas"

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
  /** Ask the API for facet counts in `meta.facets`. */
  facets?: boolean
}

/** Same coercion WITHOUT the guard, kept to demonstrate the "" -> 0 pitfall. */
export const naiveMinPriceSchema = z.coerce.number().min(0).optional()

// ---- facets (B1) ------------------------------------------------------------

/** `GET /products?facets=true` adds these counts to `meta`. Each facet ignores its OWN filter. */
export const facetsSchema = z.object({
  brands: z.array(z.object({ value: z.string(), count: z.number().int() })),
  price: z.object({ min: z.number(), max: z.number() }),
  rating: z.array(z.object({ value: z.number(), count: z.number().int() })),
  inStock: z.object({ count: z.number().int() }),
})
export type Facets = z.infer<typeof facetsSchema>

export const productListMetaSchema = pageMetaSchema.extend({
  facets: facetsSchema.optional(),
})
export type ProductListMeta = z.infer<typeof productListMetaSchema>

// ---- categories and brands (B1) ----------------------------------------------

export type CategoryNode = {
  id: string
  name: string
  slug: string
  image?: string | null
  productCount: number
  children: CategoryNode[]
}

/** The tree is recursive, so the schema refers to itself lazily. */
export const categoryNodeSchema: z.ZodType<CategoryNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    image: z.string().nullish(),
    productCount: z.number().int(),
    children: z.array(categoryNodeSchema),
  })
)

const categoryBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
})

/** `GET /categories/:slug`: `ancestors` runs root -> parent (the breadcrumb trail). */
export const categoryDetailSchema = categoryBriefSchema.extend({
  image: z.string().nullable(),
  parent: z.string().nullable(),
  ancestors: z.array(categoryBriefSchema),
  children: z.array(
    categoryBriefSchema.extend({
      image: z.string().nullable(),
      productCount: z.number().int(),
    })
  ),
  productCount: z.number().int(),
})
export type CategoryDetail = z.infer<typeof categoryDetailSchema>

export const brandSchema = z.object({
  name: z.string(),
  count: z.number().int(),
})
export type Brand = z.infer<typeof brandSchema>
