import { useQuery } from "@tanstack/react-query"

import { toAsyncState } from "@/lib/queryState"

import { productQueries } from "../queries"

/**
 * Stage 1's `priceHistogram` over a SAMPLE of the category (the API's max page of 60), keyed by
 * category only, so it does not refetch when filters change. It is an approximation: a
 * server-side bucket facet would be exact.
 */
export const usePriceHistogram = (categorySlug: string | undefined) =>
  toAsyncState(useQuery(productQueries.histogram(categorySlug)))
