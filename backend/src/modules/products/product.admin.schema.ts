import { z } from "zod"

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id")
const idParams = z.object({ id: objectId })
const STATUSES = ["active", "draft", "archived"] as const

// Prices are whole rupees (integers), like the rest of the API: never floats.
const rupees = (max = 10_000_000) => z.number().int().min(0).max(max)

const variantSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  color: z.string().trim().max(40).optional(),
  size: z.string().trim().max(40).optional(),
  price: rupees(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
})

// No `.default()` here on purpose: in Zod 4 a default also fires inside `.partial()`, so a PATCH
// without `images` would silently wipe them. The service applies the create-time defaults.
const productBody = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes")
    .max(220)
    .optional(),
  description: z.string().trim().max(10_000),
  highlights: z.array(z.string().trim().min(1).max(200)).max(10),
  brand: z.string().trim().min(1).max(80),
  categoryId: objectId,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  price: rupees().refine((n) => n >= 1, "Price must be at least 1"),
  mrp: rupees().refine((n) => n >= 1, "MRP must be at least 1"),
  stock: z.number().int().min(0).max(1_000_000),
  sku: z.string().trim().min(1).max(60),
  images: z
    .array(
      z.object({
        url: z.string().trim().url().max(500),
        alt: z.string().trim().max(200).optional(),
      })
    )
    .max(10),
  specs: z
    .array(
      z.object({
        key: z.string().trim().min(1).max(60),
        value: z.string().trim().min(1).max(200),
      })
    )
    .max(30),
  variants: z.array(variantSchema).max(50),
  status: z.enum(STATUSES),
  // Admin only (a seller's value is ignored): featured flag and the owning seller.
  isFeatured: z.boolean().optional(),
  sellerId: objectId.optional(),
})

const priceOk = (b: { price?: number; mrp?: number }) =>
  b.price === undefined || b.mrp === undefined || b.price <= b.mrp
const priceMsg = { message: "Price cannot be higher than the MRP", path: ["price"] }

const optionalOnCreate = [
  "description",
  "highlights",
  "tags",
  "stock",
  "images",
  "specs",
  "variants",
  "status",
] as const
export const createProductSchema = {
  body: productBody
    .partial(
      Object.fromEntries(optionalOnCreate.map((k) => [k, true])) as Record<
        (typeof optionalOnCreate)[number],
        true
      >
    )
    .refine(priceOk, priceMsg),
}
export const updateProductSchema = {
  params: idParams,
  body: productBody.partial().refine(priceOk, priceMsg),
}
export const productIdSchema = { params: idParams }

const bool = z.enum(["true", "false"]).transform((v) => v === "true")
export const ADMIN_SORTS = [
  "createdAt",
  "updatedAt",
  "name",
  "price",
  "stock",
  "soldCount",
] as const

const listQuery = z.object({
  search: z.string().trim().min(1).max(100).optional(), // name / sku / brand, partial match
  status: z.enum(STATUSES).optional(),
  category: objectId.optional(), // includes sub-categories
  brand: z.string().trim().min(1).max(80).optional(),
  seller: objectId.optional(), // admin only; sellers are always scoped to themselves
  lowStock: bool.optional(), // stock <= 5
  sort: z.enum(ADMIN_SORTS).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})
export const listAdminProductsSchema = { query: listQuery }
export const exportProductsSchema = { query: listQuery.omit({ page: true, limit: true }) }

export const bulkProductsSchema = {
  body: z.object({
    ids: z.array(objectId).min(1).max(100),
    status: z.enum(STATUSES),
  }),
}
