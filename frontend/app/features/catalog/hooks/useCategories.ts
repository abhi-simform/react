import { useAsyncResource } from "@/hooks/useAsyncResource"

import { getCategory, getCategoryTree } from "../api"

/** The whole tree (shared, cached request): header menu, filter sidebar, 404 page. */
export const useCategoryTree = () =>
  useAsyncResource("category-tree", () => getCategoryTree())

/** One category with its breadcrumb `ancestors` and `children`; 404 -> error state. */
export const useCategory = (slug: string) =>
  useAsyncResource(`category:${slug}`, (signal) => getCategory(slug, signal))
