import { getProduct, type Product } from "@/features/catalog"
import { queryClient, STALE } from "@/lib/query-client"
import { productKeys, railKeys } from "@/lib/queryKeys"

import {
  getAlsoBought,
  getForYou,
  getRecentlyViewed,
  getSimilar,
  getTrending,
} from "./recommendations.api"

/** What every rail query returns: the products and an optional one-line note under the title. */
export type RailData = { items: Product[]; note?: string }

/**
 * A rail's query, as plain data (the same three fields `queryOptions` would hold). Plain on
 * purpose: `ProductRail` accepts ANY rail, and a `queryOptions` result is typed by its specific
 * key tuple, which would make the prop generic for no gain.
 */
export type RailOptions = {
  queryKey: readonly unknown[]
  queryFn: (context: { signal: AbortSignal }) => Promise<RailData>
  staleTime: number
}
const rail = (o: RailOptions): RailOptions => o

/**
 * One `queryOptions` per rail (9.2 rules: key + fetcher together). Personal rails carry the owner
 * in the key and are cleared when the user changes (`SessionCacheSync` knows `railKeys.all`).
 */
export const railQueries = {
  similar: (productId: string) =>
    rail({
      queryKey: railKeys.similar(productId),
      queryFn: async ({ signal }): Promise<RailData> => ({
        items: await getSimilar(productId, signal),
      }),
      staleTime: STALE.catalog,
    }),
  alsoBought: (productId: string) =>
    rail({
      queryKey: railKeys.alsoBought(productId),
      queryFn: async ({ signal }): Promise<RailData> => {
        const { data, meta } = await getAlsoBought(productId, signal)
        return {
          items: data,
          // Honest label: with no purchase data the API tops the rail up with similar products.
          note:
            meta.source === "orders"
              ? undefined
              : meta.source === "mixed"
                ? "Mostly bought together; the rest are similar items."
                : "Not enough purchase data yet: showing similar items.",
        }
      },
      staleTime: STALE.catalog,
    }),
  trending: (category?: string) =>
    rail({
      queryKey: railKeys.trending(category),
      queryFn: async ({ signal }): Promise<RailData> => ({
        items: await getTrending(category, signal),
      }),
      staleTime: STALE.catalog,
    }),
  /** `owner`: user id or "guest"; `seed`: a guest's local list (a signed-in user's history is on the server). */
  forYou: (owner: string, seed: readonly string[]) =>
    rail({
      queryKey: railKeys.forYou(owner, seed),
      queryFn: async ({ signal }): Promise<RailData> => {
        const { data, meta } = await getForYou(seed, signal)
        return {
          items: data,
          note: meta.personalised
            ? `Based on ${meta.basedOn.join(", ")}`
            : "Popular right now. Browse a few products to personalise this.",
        }
      },
      staleTime: STALE.catalog,
    }),
  recentlyViewed: (userId: string) =>
    rail({
      queryKey: railKeys.recentlyViewed(userId),
      queryFn: async ({ signal }): Promise<RailData> => ({
        items: await getRecentlyViewed(signal),
      }),
      // Written by the PDP (after 3 s), so a visit back to the home page should see it.
      staleTime: STALE.none,
    }),
  /**
   * A guest's list lives in localStorage (ids only), so the products are fetched one by one
   * through the SAME detail cache the PDP uses (each id is a `productQueries.detail` entry:
   * an id the shopper just viewed is already cached).
   */
  guestRecentlyViewed: (ids: readonly string[]) =>
    rail({
      queryKey: railKeys.recentlyViewed("guest", ids),
      queryFn: async (): Promise<RailData> => {
        const settled = await Promise.allSettled(
          ids.map((id) =>
            queryClient.ensureQueryData({
              queryKey: productKeys.detail(id),
              queryFn: ({ signal }) => getProduct(id, signal),
              staleTime: STALE.live,
            })
          )
        )
        return {
          items: settled.flatMap((r) =>
            r.status === "fulfilled"
              ? [
                  {
                    ...r.value,
                    // A detail has its category path expanded; list rows carry ids.
                    categoryPath: r.value.categoryPath.map((c) => c._id),
                  },
                ]
              : []
          ),
        }
      },
      staleTime: STALE.catalog,
    }),
}
