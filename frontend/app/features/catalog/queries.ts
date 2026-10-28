import { queryOptions } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api/client"
import { brandKeys, categoryKeys, productKeys } from "@/lib/queryKeys"

import {
  getBrands,
  getCategory,
  getProduct,
  getProducts,
} from "./api"
import { categoryNodeSchema } from "./schemas"
import type { ProductQuery } from "./types"
import { priceHistogram } from "./utils"

/**
 * `queryOptions` factories (9.2): ONE definition of key + fetcher, reused by hooks, prefetch
 * (9.7) and tests (Stage 12). Components never write an inline key.
 */
export const productQueries = {
  list: (filters: ProductQuery) =>
    queryOptions({
      queryKey: productKeys.list(filters),
      queryFn: ({ signal }) => getProducts(filters, signal),
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: productKeys.detail(slug),
      queryFn: ({ signal }) => getProduct(slug, signal),
    }),
  /** A sample of a category for the price histogram (see `usePriceHistogram`). */
  histogram: (categorySlug: string | undefined) =>
    queryOptions({
      queryKey: [...productKeys.all, "histogram", categorySlug ?? null] as const,
      queryFn: async ({ signal }) =>
        priceHistogram(
          (await getProducts({ category: categorySlug, limit: 60 }, signal))
            .items,
          8
        ),
    }),
}

export const categoryQueries = {
  tree: () =>
    queryOptions({
      queryKey: categoryKeys.tree(),
      queryFn: ({ signal }) =>
        api("/categories", { schema: z.array(categoryNodeSchema), signal }),
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: categoryKeys.detail(slug),
      queryFn: ({ signal }) => getCategory(slug, signal),
    }),
}

export const brandQueries = {
  list: (categorySlug?: string) =>
    queryOptions({
      queryKey: brandKeys.list(categorySlug),
      queryFn: ({ signal }) => getBrands(categorySlug, signal),
    }),
}
