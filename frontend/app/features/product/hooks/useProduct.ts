import { useAsyncResource } from "@/hooks/useAsyncResource"
import { getProduct, getProducts } from "@/features/catalog"

/** `GET /products/:slug` through the hand-rolled hook (Stage 9 replaces it). */
export const useProduct = (slug: string) =>
  useAsyncResource(`product:${slug}`, (signal) => getProduct(slug, signal))

/** A few other products from the same category, for the "related" links. */
export const useRelatedProducts = (categorySlug: string, excludeSlug: string) =>
  useAsyncResource(`related:${categorySlug}:${excludeSlug}`, async (signal) => {
    const page = await getProducts(
      { category: categorySlug, limit: 6, sort: "rating" },
      signal
    )
    return page.items.filter((p) => p.slug !== excludeSlug).slice(0, 5)
  })
