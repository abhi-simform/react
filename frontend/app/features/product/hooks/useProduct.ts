import { useQuery } from "@tanstack/react-query"

import { productQueries } from "@/features/catalog"
import { toAsyncState } from "@/lib/queryState"

import { relatedQueries } from "../queries"

/** `GET /products/:slug` as a query: shared by the PDP, prefetch (9.7) and tests. */
export const useProduct = (slug: string) =>
  toAsyncState(useQuery(productQueries.detail(slug)))

/** A few other products from the same category, for the "related" links. */
export const useRelatedProducts = (categorySlug: string, excludeSlug: string) =>
  toAsyncState(useQuery(relatedQueries.list(categorySlug, excludeSlug)))
