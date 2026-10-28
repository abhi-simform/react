import { getJson } from "@/lib/api/getJson"

import type { Product } from "./types"

// Temporary hand-written narrowing (2.3). It only checks what the home rails
// display; Zod schemas replace this in 2.6, which is exactly the pain Zod removes.
function isProductList(body: unknown): body is { data: Product[] } {
  return (
    typeof body === "object" &&
    body !== null &&
    "data" in body &&
    Array.isArray(body.data) &&
    body.data.every(
      (p: unknown) =>
        typeof p === "object" &&
        p !== null &&
        "name" in p &&
        typeof p.name === "string" &&
        "price" in p &&
        typeof p.price === "number"
    )
  )
}

async function getProductList(url: string): Promise<Product[]> {
  const body = await getJson(url)
  if (!isProductList(body)) throw new Error(`Unexpected response from ${url}`)
  return body.data
}

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
    getProductList(`${baseUrl}/products?limit=8&sort=newest`),
    getProductList(`${baseUrl}/products?limit=8&sort=rating`),
    getProductList(`${baseUrl}/this-route-does-not-exist`),
  ])

  const errors: string[] = []
  for (const result of [newest, topRated, broken]) {
    if (result.status === "rejected") errors.push(String(result.reason))
  }

  return {
    newest: newest.status === "fulfilled" ? newest.value : null,
    topRated: topRated.status === "fulfilled" ? topRated.value : null,
    errors,
  }
}
