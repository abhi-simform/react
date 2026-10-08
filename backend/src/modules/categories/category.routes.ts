import { Router } from "express"
import { ok } from "../../utils/response.js"
import { Category } from "./category.model.js"

export const categoryRoutes = Router()

interface Node {
  id: string
  name: string
  slug: string
  image?: string | null
  children: Node[]
}

// GET /categories -> nested tree. (B1 adds admin CRUD, product counts, brands & facets.)
categoryRoutes.get("/", async (_req, res) => {
  const all = await Category.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean()
  const nodes = new Map<string, Node>(
    all.map((c) => [
      String(c._id),
      { id: String(c._id), name: c.name, slug: c.slug, image: c.image, children: [] },
    ])
  )
  const roots: Node[] = []
  for (const c of all) {
    const node = nodes.get(String(c._id))!
    const parent = c.parent ? nodes.get(String(c.parent)) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  ok(res, roots)
})
