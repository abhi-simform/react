import { useFetch } from "@/hooks/useFetch"
import { getProduct, getProducts } from "@/features/catalog"

/** `GET /products/:slug` through `useFetch` (Stage 9 replaces it). */
export const useProduct = (slug: string) =>
  useFetch((signal) => getProduct(slug, signal), [slug])

/** A few other products from the same category, for the "related" links. */
export const useRelatedProducts = (categorySlug: string, excludeSlug: string) =>
  useFetch(
    async (signal) => {
      const page = await getProducts(
        { category: categorySlug, limit: 6, sort: "rating" },
        signal
      )
      return page.items.filter((p) => p.slug !== excludeSlug).slice(0, 5)
    },
    [categorySlug, excludeSlug]
  )
