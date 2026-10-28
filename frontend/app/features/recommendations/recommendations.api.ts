import { z } from "zod"

import { api, apiWithMeta } from "@/lib/api/client"
import { productSchema, type Product } from "@/features/catalog"

import {
  alsoBoughtMetaSchema,
  forYouMetaSchema,
  viewedResultSchema,
} from "./schemas"

const rows = z.array(productSchema)
const enc = encodeURIComponent

export const getSimilar = (
  idOrSlug: string,
  signal?: AbortSignal
): Promise<Product[]> =>
  api(`/products/${enc(idOrSlug)}/similar`, {
    query: { limit: 12 },
    schema: rows,
    signal,
  })

export const getAlsoBought = (idOrSlug: string, signal?: AbortSignal) =>
  apiWithMeta(`/products/${enc(idOrSlug)}/also-bought`, {
    query: { limit: 12 },
    schema: rows,
    metaSchema: alsoBoughtMetaSchema,
    signal,
  })

export const getTrending = (
  category?: string,
  signal?: AbortSignal
): Promise<Product[]> =>
  api("/recommendations/trending", {
    query: { limit: 12, category },
    schema: rows,
    signal,
  })

/** Signed in: the Bearer token personalises. Guests may pass their local recently viewed ids. */
export const getForYou = (seed: readonly string[], signal?: AbortSignal) =>
  apiWithMeta("/recommendations/for-you", {
    query: { limit: 12, seed: seed.length ? seed.join(",") : undefined },
    schema: rows,
    metaSchema: forYouMetaSchema,
    auth: true,
    signal,
  })

export const getRecentlyViewed = (signal?: AbortSignal): Promise<Product[]> =>
  api("/me/recently-viewed", {
    query: { limit: 12 },
    schema: rows,
    auth: true,
    signal,
  })

export type ViewItem = { productId: string; viewedAt?: string }
/** Fire-and-forget (202). Also used to MERGE the guest list after login. */
export const postViews = (items: ViewItem[]) =>
  api("/me/recently-viewed", {
    method: "POST",
    body: { items },
    schema: viewedResultSchema,
    auth: true,
  })
