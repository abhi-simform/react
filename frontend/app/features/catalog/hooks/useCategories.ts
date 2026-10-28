import { useFetch } from "@/hooks/useFetch"

import { getCategory, getCategoryTree } from "../api"

/** The whole tree (shared, cached request): header menu, filter sidebar, 404 page. */
export const useCategoryTree = () => useFetch(() => getCategoryTree(), [])

/**
 * One category with its breadcrumb `ancestors` and `children`; 404 -> error state.
 * Without a slug (the plain /products page) nothing is requested and the data is `null`.
 */
export const useCategory = (slug: string | undefined) =>
  useFetch(
    async (signal) => (slug === undefined ? null : getCategory(slug, signal)),
    [slug ?? null]
  )
