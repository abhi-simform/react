import { api } from "@/lib/api/client"
import type { Brand, Category } from "@/features/products/types"

export type CategoryNode = {
  id: string
  name: string
  slug: string
  children: CategoryNode[]
}

export const listCategoriesFlat = () => api<Category[]>("/admin/categories")
/** Public tree (active only): what a seller can pick a category from. */
export const listPublicCategories = () => api<CategoryNode[]>("/categories")

export type CategoryInput = {
  name?: string
  parentId?: string | null
  isActive?: boolean
  image?: string | null
}
export const createCategory = (body: CategoryInput) =>
  api<Category>("/admin/categories", { method: "POST", body })
export const updateCategory = (id: string, body: CategoryInput) =>
  api<Category>(`/admin/categories/${id}`, { method: "PATCH", body })
export const deleteCategory = (id: string) =>
  api(`/admin/categories/${id}`, { method: "DELETE" })
export const reorderCategories = (parentId: string | null, ids: string[]) =>
  api<Category[]>("/admin/categories/reorder", {
    method: "PUT",
    body: { parentId, ids },
  })

export const listBrands = (search?: string) =>
  api<Brand[]>("/admin/brands", { query: { search } })
export const createBrand = (body: { name: string; logo?: string | null }) =>
  api<Brand>("/admin/brands", { method: "POST", body })
export const updateBrand = (
  id: string,
  body: { name?: string; logo?: string | null }
) => api<Brand>(`/admin/brands/${id}`, { method: "PATCH", body })
export const deleteBrand = (id: string) =>
  api(`/admin/brands/${id}`, { method: "DELETE" })

/** Public brand names (what a seller picks from; counts of ACTIVE products). */
export const listPublicBrands = () =>
  api<{ name: string; count: number }[]>("/brands")

export function flattenTree(
  nodes: CategoryNode[],
  depth = 0
): { id: string; label: string }[] {
  return nodes.flatMap((n) => [
    { id: n.id, label: `${"— ".repeat(depth)}${n.name}` },
    ...flattenTree(n.children, depth + 1),
  ])
}
