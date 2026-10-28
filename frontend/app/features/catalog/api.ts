import { request, requestPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"
import type { ProductDetail } from "@/types/domain"

import type { Product, ProductQuery } from "./types"

export const getProducts = (
  query: ProductQuery = {}
): Promise<Paginated<Product>> =>
  requestPaginated<Product>(`/products${toQueryString(query)}`)

export const getProduct = (slug: string): Promise<ProductDetail> =>
  request<ProductDetail>(`/products/${encodeURIComponent(slug)}`)
