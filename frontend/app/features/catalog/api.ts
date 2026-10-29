import { z } from "@/lib/zod"

import { api, apiPaginatedWithMeta } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"

import {
  brandSchema,
  categoryDetailSchema,
  productDetailSchema,
  productListMetaSchema,
  productSchema,
} from "./schemas"
import type {
  Brand,
  CategoryDetail,
  Product,
  ProductDetail,
  ProductListMeta,
  ProductQuery,
} from "./types"

/** Takes an already-built query string ("?page=2"), so hooks can use it as a stable dependency. */
export const getProductsByQuery = (
  queryString: string,
  signal?: AbortSignal
): Promise<Paginated<Product, ProductListMeta>> =>
  apiPaginatedWithMeta(`/products${queryString}`, {
    schema: productSchema,
    metaSchema: productListMetaSchema,
    signal,
  })

export const getProducts = (
  query: ProductQuery = {},
  signal?: AbortSignal
): Promise<Paginated<Product, ProductListMeta>> =>
  getProductsByQuery(toQueryString(query), signal)

export const getProduct = (
  idOrSlug: string,
  signal?: AbortSignal
): Promise<ProductDetail> =>
  api(`/products/${encodeURIComponent(idOrSlug)}`, {
    schema: productDetailSchema,
    signal,
  })

export const getCategory = (
  slug: string,
  signal?: AbortSignal
): Promise<CategoryDetail> =>
  api(`/categories/${encodeURIComponent(slug)}`, {
    schema: categoryDetailSchema,
    signal,
  })

export const getBrands = (
  categorySlug?: string,
  signal?: AbortSignal
): Promise<Brand[]> =>
  api(`/brands${toQueryString({ category: categorySlug })}`, {
    schema: z.array(brandSchema),
    signal,
  })
