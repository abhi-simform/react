import { api, apiPaged, apiText } from "@/lib/api/client"
import { getUser } from "@/lib/auth/session"
import type { ProductDetail, ProductRow } from "./types"

// Admins use /admin/products (all products). Sellers use /seller/products: the API pins every
// query to THEIR products, so the same screen is safe for both roles.
export const productsBase = () =>
  getUser()?.role === "admin" ? "/admin/products" : "/seller/products"

export type ProductListParams = {
  search?: string
  status?: string
  category?: string
  brand?: string
  lowStock?: boolean
  sort: string
  order: string
  page: number
  limit: number
}

export const listProducts = (p: ProductListParams, signal?: AbortSignal) =>
  apiPaged<ProductRow>(productsBase(), { query: p, signal })

export const getProduct = (id: string, signal?: AbortSignal) =>
  api<ProductDetail>(`${productsBase()}/${id}`, { signal })

export const createProduct = (body: unknown) =>
  api<ProductDetail>(productsBase(), { method: "POST", body })

export const updateProduct = (id: string, body: unknown) =>
  api<ProductDetail>(`${productsBase()}/${id}`, { method: "PATCH", body })

export const archiveProduct = (id: string) =>
  api<ProductDetail>(`${productsBase()}/${id}`, { method: "DELETE" })

export const bulkSetStatus = (ids: string[], status: string) =>
  api<{ requested: number; matched: number; modified: number }>(
    `${productsBase()}/bulk`,
    {
      method: "POST",
      body: { ids, status },
    }
  )

/** The CSV comes from the API for the CURRENT filters (not from the 20 rows on screen). */
export const exportProductsCsv = (
  p: Omit<ProductListParams, "page" | "limit">
) => apiText(`${productsBase()}/export.csv`, { query: p })
