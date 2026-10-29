import { isValidObjectId } from "mongoose"
import type { z } from "zod"
import type { Role } from "../../config/constants.js"
import { enqueue } from "../../jobs/queue.js"
import { ApiError } from "../../utils/ApiError.js"
import { slugify } from "../../utils/slugify.js"
import { ensureBrands } from "../categories/category.admin.service.js"
import { Category } from "../categories/category.model.js"
import { User } from "../users/user.model.js"
import { Product } from "./product.model.js"
import type {
  createProductSchema,
  exportProductsSchema,
  listAdminProductsSchema,
  updateProductSchema,
} from "./product.admin.schema.js"

type CreateInput = z.output<typeof createProductSchema.body>
type UpdateInput = z.output<typeof updateProductSchema.body>
type ListQuery = z.output<typeof listAdminProductsSchema.query>

/**
 * Who is asking. `scope: "own"` (the /seller area) pins every query to the caller's products,
 * whatever their role; `"all"` (the /admin area) sees everything. A product that is out of scope
 * is a 404, never a 403: callers cannot probe which ids exist.
 */
export interface Actor {
  id: string
  role: Role
  scope: "own" | "all"
}

const fieldError = (
  path: string,
  message: string,
  status = 422,
  code = "VALIDATION_ERROR"
) => new ApiError(status, code, "Validation failed", [{ in: "body", path, message }])

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

function ownerFilter(actor: Actor): Record<string, unknown> {
  return actor.scope === "own" ? { seller: actor.id } : {}
}

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "product"
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`
    const hit = await Product.findOne({ slug }).select("_id").lean()
    if (!hit || String(hit._id) === excludeId) return slug
  }
}

async function categoryPathOf(categoryId: string) {
  const cat = await Category.findById(categoryId).lean()
  if (!cat) throw fieldError("categoryId", "Category not found")
  return { category: cat._id, categoryPath: [...cat.ancestors, cat._id] }
}

function checkVariants(variants: { sku: string }[], productSku: string) {
  const seen = new Set<string>()
  variants.forEach((v, i) => {
    const key = v.sku.toLowerCase()
    if (seen.has(key) || key === productSku.toLowerCase())
      throw fieldError(`variants.${i}.sku`, "Each variant needs its own SKU")
    seen.add(key)
  })
}

// Duplicate sku/slug surface as Mongo E11000: turn them into field errors the form can place.
function mapDuplicate(err: unknown): never {
  const e = err as { code?: number; keyPattern?: Record<string, unknown> }
  if (e.code === 11000) {
    const key = Object.keys(e.keyPattern ?? {})[0] === "slug" ? "slug" : "sku"
    throw fieldError(
      key,
      key === "sku"
        ? "That SKU is already used by another product"
        : "That slug is already used",
      409,
      key === "sku" ? "SKU_TAKEN" : "SLUG_TAKEN"
    )
  }
  throw err
}

async function resolveSeller(actor: Actor, sellerId?: string) {
  if (actor.scope === "own" || actor.role !== "admin") return actor.id
  if (!sellerId) return actor.id // an admin's own listing unless they pick a seller
  const seller = await User.findById(sellerId).select("role").lean()
  if (!seller || (seller.role !== "seller" && seller.role !== "admin"))
    throw fieldError("sellerId", "Seller not found")
  return sellerId
}

export async function createProduct(actor: Actor, input: CreateInput) {
  const variants = input.variants ?? []
  checkVariants(variants, input.sku)
  const doc = new Product({
    name: input.name,
    slug: input.slug ?? (await uniqueSlug(input.name)),
    description: input.description ?? "",
    highlights: input.highlights ?? [],
    brand: input.brand,
    ...(await categoryPathOf(input.categoryId)),
    tags: input.tags ?? [],
    price: input.price,
    mrp: input.mrp,
    stock: input.stock ?? 0, // overwritten by the model when variants exist
    sku: input.sku,
    images: input.images ?? [],
    specs: input.specs ?? [],
    variants,
    status: input.status ?? "draft",
    isFeatured: actor.role === "admin" ? (input.isFeatured ?? false) : false,
    seller: await resolveSeller(actor, input.sellerId),
  })
  try {
    await doc.save()
  } catch (err) {
    mapDuplicate(err)
  }
  await ensureBrands([input.brand])
  return getProduct(actor, String(doc._id))
}

export async function updateProduct(actor: Actor, id: string, input: UpdateInput) {
  const doc = await Product.findOne({ _id: id, ...ownerFilter(actor) })
  if (!doc) throw ApiError.notFound("Product not found")

  if (input.price !== undefined || input.mrp !== undefined) {
    const price = input.price ?? doc.price
    const mrp = input.mrp ?? doc.mrp
    if (price > mrp) throw fieldError("price", "Price cannot be higher than the MRP")
  }
  if (input.variants !== undefined || input.sku !== undefined)
    checkVariants(input.variants ?? doc.variants, input.sku ?? doc.sku)
  if (input.stock !== undefined && (input.variants ?? doc.variants).length)
    throw fieldError(
      "stock",
      "Stock is the sum of the variants' stock: edit the variants"
    )

  const oldPrice = doc.price
  const { categoryId, sellerId, isFeatured, ...plain } = input
  Object.assign(doc, plain)
  if (categoryId && categoryId !== String(doc.category))
    Object.assign(doc, await categoryPathOf(categoryId))
  if (actor.role === "admin" && actor.scope === "all") {
    if (isFeatured !== undefined) doc.isFeatured = isFeatured
    if (sellerId)
      doc.seller = (await resolveSeller(actor, sellerId)) as unknown as typeof doc.seller
  }
  try {
    await doc.save()
  } catch (err) {
    mapDuplicate(err)
  }
  if (input.brand) await ensureBrands([input.brand])
  // Same as PATCH /admin/products/:id/price: a drop tells the wishlisters (background job).
  if (doc.price < oldPrice)
    await enqueue("price-drop.alert", { productId: id, from: oldPrice, to: doc.price })
  return getProduct(actor, id)
}

/** Archive = status "archived": hidden from the storefront, kept for order history. */
export async function archiveProduct(actor: Actor, id: string) {
  return updateProduct(actor, id, { status: "archived" })
}

export async function bulkSetStatus(
  actor: Actor,
  ids: string[],
  status: "active" | "draft" | "archived"
) {
  const res = await Product.updateMany(
    { _id: { $in: ids }, ...ownerFilter(actor) },
    { status }
  )
  // Ids that are not yours simply do not match: matched < requested tells the caller.
  return { requested: ids.length, matched: res.matchedCount, modified: res.modifiedCount }
}

export async function getProduct(actor: Actor, id: string) {
  if (!isValidObjectId(id)) throw ApiError.notFound("Product not found")
  const product = await Product.findOne({ _id: id, ...ownerFilter(actor) })
    .populate("category", "name slug")
    .populate("seller", "name email")
    .lean()
  if (!product) throw ApiError.notFound("Product not found")
  return product
}

async function buildFilter(actor: Actor, q: Omit<ListQuery, "page" | "limit">) {
  const filter: Record<string, unknown> = { ...ownerFilter(actor) }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i")
    filter.$or = [{ name: rx }, { sku: rx }, { brand: rx }]
  }
  if (q.status) filter.status = q.status
  if (q.category) filter.categoryPath = q.category
  if (q.brand) filter.brand = q.brand
  if (q.seller && actor.scope === "all") filter.seller = q.seller
  if (q.lowStock) filter.stock = { $lte: 5 }
  return filter
}

const sortOf = (q: Pick<ListQuery, "sort" | "order">) =>
  ({ [q.sort]: q.order === "asc" ? 1 : -1, _id: 1 }) as Record<string, 1 | -1>

export async function listProducts(actor: Actor, q: ListQuery) {
  const filter = await buildFilter(actor, q)
  const [items, total] = await Promise.all([
    Product.find(filter, { description: 0, specs: 0, highlights: 0, variants: 0 })
      .sort(sortOf(q))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .populate("category", "name slug")
      .populate("seller", "name")
      .lean(),
    Product.countDocuments(filter),
  ])
  return { items, total }
}

// A cell starting with = + - @ is run as a formula by spreadsheets: neutralise it.
const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** The current filtered view as CSV (up to 5000 rows), straight from the database. */
export async function exportProductsCsv(
  actor: Actor,
  q: z.output<typeof exportProductsSchema.query>
) {
  const filter = await buildFilter(actor, q)
  const rows = await Product.find(filter, {
    name: 1,
    sku: 1,
    brand: 1,
    price: 1,
    mrp: 1,
    stock: 1,
    status: 1,
    category: 1,
    soldCount: 1,
  })
    .sort(sortOf(q))
    .limit(5000)
    .populate("category", "name")
    .lean()
  const head = [
    "sku",
    "name",
    "brand",
    "category",
    "price",
    "mrp",
    "stock",
    "status",
    "sold",
  ]
  const lines = rows.map((r) =>
    [
      r.sku,
      r.name,
      r.brand,
      (r.category as unknown as { name?: string } | null)?.name,
      r.price,
      r.mrp,
      r.stock,
      r.status,
      r.soldCount,
    ]
      .map(csvCell)
      .join(",")
  )
  return [head.join(","), ...lines].join("\n") + "\n"
}
