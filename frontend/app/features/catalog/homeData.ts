import { request } from "@/lib/api/client"

import { getProducts } from "./api"
import type { Product } from "./types"

export type HomeData = {
  newest: Product[] | null
  topRated: Product[] | null
  errors: string[]
}

/**
 * Three requests in parallel. allSettled means one failing rail does not blank
 * the page: failures become entries in `errors`, the rest still render.
 * The third request is deliberately wrong.
 */
export async function loadHomeData(): Promise<HomeData> {
  const [newest, topRated, broken] = await Promise.allSettled([
    getProducts({ limit: 8, sort: "newest" }),
    getProducts({ limit: 8, sort: "rating" }),
    request<unknown>("/this-route-does-not-exist"),
  ])

  const errors: string[] = []
  for (const result of [newest, topRated, broken]) {
    if (result.status === "rejected") errors.push(String(result.reason))
  }

  return {
    newest: newest.status === "fulfilled" ? newest.value.items : null,
    topRated: topRated.status === "fulfilled" ? topRated.value.items : null,
    errors,
  }
}
