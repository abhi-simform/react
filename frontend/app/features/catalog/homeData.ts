import { getJson } from "@/lib/api/getJson"

import type { Product } from "./types"

type ListResponse = { success: true; data: Product[] }

export type HomeData = {
  newest: Product[] | null
  topRated: Product[] | null
  errors: string[]
}

/**
 * Three requests in parallel. allSettled means one failing rail does not blank
 * the page: failures become entries in `errors`, the rest still render.
 * The third URL is deliberately wrong.
 */
export async function loadHomeData(baseUrl: string): Promise<HomeData> {
  const [newest, topRated, broken] = await Promise.allSettled([
    getJson<ListResponse>(`${baseUrl}/products?limit=8&sort=newest`),
    getJson<ListResponse>(`${baseUrl}/products?limit=8&sort=rating`),
    getJson<ListResponse>(`${baseUrl}/this-route-does-not-exist`),
  ])

  const errors: string[] = []
  for (const result of [newest, topRated, broken]) {
    if (result.status === "rejected") errors.push(String(result.reason))
  }

  return {
    newest: newest.status === "fulfilled" ? newest.value.data : null,
    topRated: topRated.status === "fulfilled" ? topRated.value.data : null,
    errors,
  }
}
