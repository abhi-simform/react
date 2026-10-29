import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { invalidate } from "../../utils/cache.js"
import { slugify } from "../../utils/slugify.js"
import { Product } from "../products/product.model.js"
import { Brand } from "./brand.model.js"
import { Category } from "./category.model.js"

const fieldError = (path: string, message: string, status = 422) =>
  new ApiError(status, "VALIDATION_ERROR", "Validation failed", [
    { in: "body", path, message },
  ])

// ---- categories -----------------------------------------------------------------------------

async function uniqueSlug(base: string, takenBy?: string) {
  const root = slugify(base) || "category"
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`
    const hit = await Category.findOne({ slug }).select("_id").lean()
    if (!hit || String(hit._id) === takenBy) return slug
  }
}

/** Flat list (the UI builds the tree), inactive ones included, with DIRECT product counts. */
export async function listCategories() {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]),
  ])
  const byCat = new Map(counts.map((c) => [String(c._id), c.count]))
  return cats.map((c) => ({
    ...c,
    parent: c.parent ? String(c.parent) : null,
    productCount: byCat.get(String(c._id)) ?? 0,
  }))
}

async function parentAncestors(parentId: string | null | undefined) {
  if (!parentId) return { parent: null, ancestors: [] as Types.ObjectId[] }
  const parent = await Category.findById(parentId).lean()
  if (!parent) throw fieldError("parentId", "Parent category not found")
  return { parent: parent._id, ancestors: [...parent.ancestors, parent._id] }
}

export async function createCategory(input: {
  name: string
  slug?: string
  parentId?: string | null
  image?: string | null
  sortOrder?: number
  isActive?: boolean
}) {
  const { parent, ancestors } = await parentAncestors(input.parentId)
  if (input.slug && (await Category.exists({ slug: input.slug })))
    throw fieldError("slug", "That slug is already used", 409)
  const siblings = await Category.countDocuments({ parent })
  const cat = await Category.create({
    name: input.name,
    slug: input.slug ?? (await uniqueSlug(input.name)),
    parent,
    ancestors,
    image: input.image ?? undefined,
    sortOrder: input.sortOrder ?? siblings,
    isActive: input.isActive ?? true,
  })
  await invalidate("catalog")
  return cat.toObject()
}

// After a move, every descendant's `ancestors` and every product's `categoryPath` must follow.
async function rebuildSubtree(id: Types.ObjectId, ancestors: Types.ObjectId[]) {
  await Product.updateMany({ category: id }, { categoryPath: [...ancestors, id] })
  for (const child of await Category.find({ parent: id }).select("_id").lean()) {
    const path = [...ancestors, id]
    await Category.updateOne({ _id: child._id }, { ancestors: path })
    await rebuildSubtree(child._id, path)
  }
}

export async function updateCategory(
  id: string,
  input: {
    name?: string
    slug?: string
    parentId?: string | null
    image?: string | null
    sortOrder?: number
    isActive?: boolean
  }
) {
  const cat = await Category.findById(id)
  if (!cat) throw ApiError.notFound("Category not found")
  if (input.name !== undefined) cat.name = input.name
  if (input.slug !== undefined && input.slug !== cat.slug) {
    if (await Category.exists({ slug: input.slug, _id: { $ne: cat._id } }))
      throw fieldError("slug", "That slug is already used", 409)
    cat.slug = input.slug
  }
  if (input.image !== undefined) cat.image = input.image ?? undefined
  if (input.sortOrder !== undefined) cat.sortOrder = input.sortOrder
  if (input.isActive !== undefined) cat.isActive = input.isActive

  let moved = false
  if (
    input.parentId !== undefined &&
    String(cat.parent ?? "") !== (input.parentId ?? "")
  ) {
    if (input.parentId === id)
      throw fieldError("parentId", "A category cannot be its own parent")
    const { parent, ancestors } = await parentAncestors(input.parentId)
    // Moving under one of your own descendants would create a cycle.
    if (ancestors.some((a) => String(a) === id))
      throw fieldError("parentId", "Cannot move a category under its own sub-category")
    cat.parent = parent as typeof cat.parent
    cat.ancestors = ancestors as typeof cat.ancestors
    moved = true
  }
  await cat.save()
  if (moved) await rebuildSubtree(cat._id, cat.ancestors as Types.ObjectId[])
  await invalidate("catalog")
  return cat.toObject()
}

/** Siblings are sorted by their position in `ids`: sortOrder = index. */
export async function reorderCategories(parentId: string | null, ids: string[]) {
  const siblings = await Category.find({ parent: parentId }).select("_id").lean()
  const have = new Set(siblings.map((s) => String(s._id)))
  if (
    ids.length !== have.size ||
    ids.some((i) => !have.has(i)) ||
    new Set(ids).size !== ids.length
  )
    throw fieldError("ids", "ids must list every category under that parent exactly once")
  await Category.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { sortOrder: index } },
    }))
  )
  await invalidate("catalog")
  return listCategories()
}

export async function deleteCategory(id: string) {
  const cat = await Category.findById(id).lean()
  if (!cat) throw ApiError.notFound("Category not found")
  const [children, products] = await Promise.all([
    Category.countDocuments({ parent: cat._id }),
    Product.countDocuments({ category: cat._id }),
  ])
  if (children || products)
    throw ApiError.conflict(
      `Category still has ${children} sub-categories and ${products} products; move them first`,
      "CATEGORY_NOT_EMPTY"
    )
  await Category.deleteOne({ _id: cat._id })
  await invalidate("catalog")
}

// ---- brands ---------------------------------------------------------------------------------

const brandSlug = (name: string) => slugify(name) || "brand"
const ci = { collation: { locale: "en", strength: 2 } } as const

/** Make sure every brand used by a product has a Brand row (idempotent, cheap). */
export async function ensureBrands(names: string[]) {
  for (const name of names) {
    if (await Brand.findOne({ name }, null, ci).select("_id").lean()) continue
    let slug = brandSlug(name)
    if (await Brand.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`
    try {
      await Brand.create({ name, slug })
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err // lost a race: fine
    }
  }
}

export async function listAdminBrands(search?: string) {
  await ensureBrands((await Product.distinct("brand")) as string[])
  const escaped = search?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const [brands, counts] = await Promise.all([
    Brand.find(escaped ? { name: new RegExp(escaped, "i") } : {}, null, ci)
      .sort({ name: 1 })
      .lean(),
    Product.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$brand", count: { $sum: 1 } } },
    ]),
  ])
  const byName = new Map(counts.map((c) => [c._id.toLowerCase(), c.count]))
  return brands.map((b) => ({
    ...b,
    productCount: byName.get(b.name.toLowerCase()) ?? 0,
  }))
}

export async function createBrand(input: { name: string; logo?: string | null }) {
  if (await Brand.findOne({ name: input.name }, null, ci).select("_id").lean())
    throw ApiError.conflict("That brand already exists", "BRAND_EXISTS")
  let slug = brandSlug(input.name)
  if (await Brand.exists({ slug })) slug = `${slug}-${Date.now().toString(36)}`
  return (
    await Brand.create({ name: input.name, slug, logo: input.logo ?? undefined })
  ).toObject()
}

export async function updateBrand(
  id: string,
  input: { name?: string; logo?: string | null }
) {
  const brand = await Brand.findById(id)
  if (!brand) throw ApiError.notFound("Brand not found")
  const oldName = brand.name
  if (input.name !== undefined && input.name !== oldName) {
    const clash = await Brand.findOne(
      { name: input.name, _id: { $ne: brand._id } },
      null,
      ci
    )
      .select("_id")
      .lean()
    if (clash) throw ApiError.conflict("That brand already exists", "BRAND_EXISTS")
    brand.name = input.name
  }
  if (input.logo !== undefined) brand.logo = input.logo ?? undefined
  await brand.save()
  if (brand.name !== oldName) {
    // The storefront reads Product.brand directly: keep it in step (the hook busts the cache).
    await Product.updateMany({ brand: oldName }, { brand: brand.name })
    await invalidate("catalog")
  }
  return brand.toObject()
}

export async function deleteBrand(id: string) {
  const brand = await Brand.findById(id).lean()
  if (!brand) throw ApiError.notFound("Brand not found")
  const products = await Product.countDocuments({ brand: brand.name })
  if (products)
    throw ApiError.conflict(
      `${products} products still use this brand; rename or reassign them first`,
      "BRAND_IN_USE"
    )
  await Brand.deleteOne({ _id: brand._id })
}
