import { queryOptions, type QueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { api } from "@/lib/api/client"
import { ApiError } from "@/lib/api/errors"
import { STALE } from "@/lib/query-client"
import { brandKeys, categoryKeys, productKeys } from "@/lib/queryKeys"

import { getBrands, getCategory, getProduct, getProducts } from "./api"
import { categoryNodeSchema } from "./schemas"
import type { Product, ProductDetail, ProductQuery } from "./types"
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
      staleTime: STALE.catalog,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: productKeys.detail(slug),
      queryFn: ({ signal }) => getProduct(slug, signal),
      // The PDP buy box shows stock and price: fresher than a list.
      staleTime: STALE.live,
    }),
  /**
   * One home-page rail (5 products). `forceFail` is the dev-only `?failRail=` demo: a believable
   * 500 after 400 ms, with retries off so the error shows at once.
   */
  rail: (
    rail: { id: string; sort: ProductQuery["sort"]; category?: string },
    forceFail = false
  ) =>
    queryOptions({
      queryKey: [...productKeys.all, "rail", rail.id, { forceFail }] as const,
      queryFn: async ({ signal }) => {
        if (forceFail) {
          await new Promise((r) => setTimeout(r, 400))
          throw new ApiError({
            status: 500,
            code: "INTERNAL_ERROR",
            message: "Demo failure",
          })
        }
        const page = await getProducts(
          { limit: 5, sort: rail.sort, category: rail.category },
          signal
        )
        return page.items
      },
      staleTime: STALE.catalog,
      retry: forceFail ? false : undefined,
    }),
  /** A sample of a category for the price histogram (see `usePriceHistogram`). */
  histogram: (categorySlug: string | undefined) =>
    queryOptions({
      queryKey: [
        ...productKeys.all,
        "histogram",
        categorySlug ?? null,
      ] as const,
      queryFn: async ({ signal }) =>
        priceHistogram(
          (await getProducts({ category: categorySlug, limit: 60 }, signal))
            .items,
          8
        ),
      staleTime: STALE.catalog,
    }),
}

export const categoryQueries = {
  tree: () =>
    queryOptions({
      queryKey: categoryKeys.tree(),
      queryFn: ({ signal }) =>
        api("/categories", { schema: z.array(categoryNodeSchema), signal }),
      staleTime: STALE.static,
    }),
  detail: (slug: string) =>
    queryOptions({
      queryKey: categoryKeys.detail(slug),
      queryFn: ({ signal }) => getCategory(slug, signal),
      staleTime: STALE.static,
    }),
}

export const brandQueries = {
  list: (categorySlug?: string) =>
    queryOptions({
      queryKey: brandKeys.list(categorySlug),
      queryFn: ({ signal }) => getBrands(categorySlug, signal),
      staleTime: STALE.static,
    }),
}

/**
 * Seeding (9.7): the PDP can show the BASIC fields immediately when the same product is already
 * in some cached list (listing, home rail, search, wishlist...). Every cached entry under
 * `["products"]` is scanned: a paginated list has `items`, a rail is a plain array, a detail is
 * a single object (skipped, it has its own entry). The long-form fields are empty until the
 * real detail arrives, so the page has its final layout from the first paint.
 */
export function findProductInCache(
  queryClient: QueryClient,
  slug: string
): ProductDetail | undefined {
  for (const [, data] of queryClient.getQueriesData({
    queryKey: productKeys.all,
  })) {
    const items: unknown[] = Array.isArray(data)
      ? data
      : data &&
          typeof data === "object" &&
          "items" in data &&
          Array.isArray(data.items)
        ? data.items
        : []
    const hit = items.find(
      (p): p is Product =>
        typeof p === "object" && p !== null && "slug" in p && p.slug === slug
    )
    if (hit)
      return {
        ...hit,
        categoryPath: [hit.category],
        description: "",
        highlights: [],
        specs: [],
      }
  }
  return undefined
}
