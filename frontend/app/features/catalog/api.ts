import { request, requestPaginated } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"

import { productDetailSchema, productSchema } from "./schemas"
import type { Product, ProductDetail, ProductQuery } from "./types"

/** Takes an already-built query string ("?page=2"), so hooks can use it as a stable dependency. */
export const getProductsByQuery = (
  queryString: string,
  signal?: AbortSignal
): Promise<Paginated<Product>> =>
  requestPaginated(`/products${queryString}`, { schema: productSchema, signal })

export const getProducts = (
  query: ProductQuery = {},
  signal?: AbortSignal
): Promise<Paginated<Product>> =>
  getProductsByQuery(toQueryString(query), signal)

export const getProduct = (
  idOrSlug: string,
  signal?: AbortSignal
): Promise<ProductDetail> =>
  request(`/products/${encodeURIComponent(idOrSlug)}`, {
    schema: productDetailSchema,
    signal,
  })
