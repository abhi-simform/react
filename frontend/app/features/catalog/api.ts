import { request, requestPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"

import { productDetailSchema, productSchema } from "./schemas"
import type { Product, ProductDetail, ProductQuery } from "./types"

export const getProducts = (
  query: ProductQuery = {}
): Promise<Paginated<Product>> =>
  requestPaginated(`/products${toQueryString(query)}`, {
    schema: productSchema,
  })

export const getProduct = (slug: string): Promise<ProductDetail> =>
  request(`/products/${encodeURIComponent(slug)}`, {
    schema: productDetailSchema,
  })
