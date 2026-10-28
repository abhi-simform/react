import { z } from "zod"

import { api, apiPaginatedWithMeta } from "@/lib/api/client"
import type { Paginated } from "@/lib/api/envelope"
import { toQueryString } from "@/lib/api/query"

import {
  brandSchema,
  categoryDetailSchema,
  categoryNodeSchema,
  productDetailSchema,
  productListMetaSchema,
  productSchema,
} from "./schemas"
import type {
  Brand,
  CategoryDetail,
  CategoryNode,
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

// The tree is tiny and identical for the header menu, the filter sidebar and the 404
// page, so share ONE request. (Stage 9's TanStack Query replaces this hand-made cache.)
let treePromise: Promise<CategoryNode[]> | undefined
export function getCategoryTree(): Promise<CategoryNode[]> {
  treePromise ??= api("/categories", {
    schema: z.array(categoryNodeSchema),
  }).catch((error: unknown) => {
    treePromise = undefined // do not cache failures
    throw error
  })
  return treePromise
}
