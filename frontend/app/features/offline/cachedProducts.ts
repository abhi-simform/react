import { z } from "zod"

/**
 * Products the service worker has cached (13.10): every product DETAIL response the shopper has opened
 * while online sits in Cache Storage (`api-public-v1`, public catalog data only). The offline page lists
 * them. Read straight from the cache: no network, no auth, nothing private can be here (the worker only
 * stores responses the API marked `Cache-Control: public`).
 */
const cachedProductSchema = z.object({
  data: z.object({
    name: z.string(),
    slug: z.string(),
    price: z.number(),
    images: z.array(z.object({ url: z.string() })).default([]),
  }),
})
export type CachedProduct = {
  slug: string
  name: string
  price: number
  image?: string
}

const DETAIL = /\/api\/v1\/products\/[^/?]+$/

export async function readCachedProducts(limit = 12): Promise<CachedProduct[]> {
  if (typeof caches === "undefined") return []
  try {
    const cache = await caches.open("api-public-v1")
    const requests = (await cache.keys()).filter((r) => DETAIL.test(r.url))
    const rows = await Promise.all(
      requests.slice(-limit).map(async (req) => {
        const res = await cache.match(req)
        const parsed = cachedProductSchema.safeParse(await res?.json())
        return parsed.success
          ? {
              slug: parsed.data.data.slug,
              name: parsed.data.data.name,
              price: parsed.data.data.price,
              image: parsed.data.data.images[0]?.url,
            }
          : null
      })
    )
    // Newest-cached first.
    return rows.filter((r) => r !== null).reverse() as CachedProduct[]
  } catch {
    return []
  }
}
