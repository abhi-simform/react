import { useFetch } from "@/hooks/useFetch"

import { getProducts } from "../api"
import { priceHistogram } from "../utils"

const BUCKETS = 8

/**
 * Stage 1's `priceHistogram` over a SAMPLE of the category (the API's max page
 * of 60), keyed by category only, so it does not refetch when filters change.
 * It is an approximation: a server-side bucket facet would be exact.
 */
export function usePriceHistogram(categorySlug: string | undefined) {
  return useFetch(
    async (signal) => {
      const page = await getProducts(
        { category: categorySlug, limit: 60 },
        signal
      )
      return priceHistogram(page.items, BUCKETS)
    },
    [categorySlug ?? null]
  )
}
