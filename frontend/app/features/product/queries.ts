import { queryOptions } from "@tanstack/react-query"

import { getProducts, productQueries } from "@/features/catalog"

/** Related products: same category, best rated, minus the product itself. */
export const relatedQueries = {
  list: (categorySlug: string, excludeSlug: string) =>
    queryOptions({
      queryKey: ["products", "related", categorySlug, excludeSlug] as const,
      queryFn: async ({ signal }) => {
        const page = await getProducts(
          { category: categorySlug, limit: 6, sort: "rating" },
          signal
        )
        return page.items.filter((p) => p.slug !== excludeSlug).slice(0, 5)
      },
    }),
}

export { productQueries }
