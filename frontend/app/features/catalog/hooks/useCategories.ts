import { useAsyncResource } from "@/hooks/useAsyncResource"

import { getCategory, getCategoryTree } from "../api"

/** The whole tree (shared, cached request): header menu, filter sidebar, 404 page. */
export const useCategoryTree = () =>
  useAsyncResource("category-tree", () => getCategoryTree())

/**
 * One category with its breadcrumb `ancestors` and `children`; 404 -> error state.
 * Without a slug (the plain /products page) nothing is requested and the data is `null`.
 */
export const useCategory = (slug: string | undefined) =>
  useAsyncResource(`category:${slug ?? "none"}`, async (signal) =>
    slug === undefined ? null : getCategory(slug, signal)
  )
