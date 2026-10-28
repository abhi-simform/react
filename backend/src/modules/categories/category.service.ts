import { ApiError } from "../../utils/ApiError.js"
import { Product } from "../products/product.model.js"
import { Category } from "./category.model.js"

export interface CategoryNode {
  id: string
  name: string
  slug: string
  image?: string | null
  productCount: number // active products in this category AND all its descendants
  children: CategoryNode[]
}

// Active product count per category id, counting each product under itself and every ancestor
// (categoryPath = ancestors + itself), so a parent shows the size of its whole subtree.
async function subtreeCounts(): Promise<Map<string, number>> {
  const rows = await Product.aggregate<{ _id: unknown; count: number }>([
    { $match: { status: "active" } },
    { $unwind: "$categoryPath" },
    { $group: { _id: "$categoryPath", count: { $sum: 1 } } },
  ])
  return new Map(rows.map((r) => [String(r._id), r.count]))
}

export async function getCategoryTree(): Promise<CategoryNode[]> {
  const [all, counts] = await Promise.all([
    Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 }).lean(),
    subtreeCounts(),
  ])
  const nodes = new Map<string, CategoryNode>(
    all.map((c) => [
      String(c._id),
      {
        id: String(c._id),
        name: c.name,
        slug: c.slug,
        image: c.image,
        productCount: counts.get(String(c._id)) ?? 0,
        children: [],
      },
    ])
  )
  const roots: CategoryNode[] = []
  for (const c of all) {
    const node = nodes.get(String(c._id))!
    const parent = c.parent ? nodes.get(String(c.parent)) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

const brief = (c: { _id: unknown; name: string; slug: string }) => ({
  id: String(c._id),
  name: c.name,
  slug: c.slug,
})

// Detail = the category + breadcrumb trail (root -> parent) + direct children + subtree count.
export async function getCategoryBySlug(slug: string) {
  const cat = await Category.findOne({ slug, isActive: true }).lean()
  if (!cat) throw ApiError.notFound("Category not found")
  const [ancestorDocs, children, counts] = await Promise.all([
    Category.find({ _id: { $in: cat.ancestors } }).lean(),
    Category.find({ parent: cat._id, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean(),
    subtreeCounts(),
  ])
  // $in does not keep order; rebuild root -> parent order from `ancestors`.
  const byId = new Map(ancestorDocs.map((a) => [String(a._id), a]))
  const ancestors = cat.ancestors.flatMap((id) => {
    const a = byId.get(String(id))
    return a ? [brief(a)] : []
  })
  return {
    ...brief(cat),
    image: cat.image ?? null,
    parent: cat.parent ? String(cat.parent) : null,
    ancestors,
    children: children.map((c) => ({
      ...brief(c),
      image: c.image ?? null,
      productCount: counts.get(String(c._id)) ?? 0,
    })),
    productCount: counts.get(String(cat._id)) ?? 0,
  }
}

// Distinct brands with active-product counts, optionally scoped to a category subtree.
export async function listBrands(categorySlug?: string) {
  const match: Record<string, unknown> = { status: "active" }
  if (categorySlug) {
    const cat = await Category.findOne({ slug: categorySlug }).select("_id").lean()
    if (!cat) return []
    match.categoryPath = cat._id
  }
  const rows = await Product.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: "$brand", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ])
  return rows.map((r) => ({ name: r._id, count: r.count }))
}
