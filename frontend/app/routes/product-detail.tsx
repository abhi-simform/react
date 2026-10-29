import { data } from "react-router"

import { ProductDetailPage } from "@/features/product"
import { productDetailSchema } from "@/features/catalog"

import { RouteErrorView } from "@/components/common/RouteErrorView"
import { ApiError } from "@/lib/api/errors"
import { serverGet } from "@/lib/serverApi.server"

import type { Route } from "./+types/product-detail"

/**
 * 14.8 (SSR experiment). The `loader` runs ON THE SERVER for a document request (and on a client-side navigation it
 * is called through a `.data` request to the server, so the browser never needs the internal API URL).
 * - the product is in the HTML: title, description, canonical, price, JSON-LD (View Source shows them)
 * - a slug that does not exist is a real HTTP 404 (the SPA answers 200 with a "not found" screen: a soft 404)
 * - the page seeds TanStack Query with it (`initialProduct`), so the client does not fetch it again
 * Reviews, recommendations and everything user-specific stay client-side Query, as the plan says.
 */
export async function loader({ params }: Route.LoaderArgs) {
  try {
    const product = await serverGet(
      `/products/${encodeURIComponent(params.productSlug)}`,
      productDetailSchema
    )
    return { product, loadedAt: Date.now() }
  } catch (error) {
    if (error instanceof ApiError && error.status === 404)
      throw data(null, { status: 404, statusText: "Product not found" })
    throw error
  }
}

/** The HTML of a product page does not depend on who asks: let a CDN keep it briefly (stock and price move). */
export function headers() {
  return {
    "Cache-Control":
      "public, max-age=0, s-maxage=30, stale-while-revalidate=60",
  }
}

export default function ProductDetailRoute({
  params,
  loaderData,
}: Route.ComponentProps) {
  // `loaderData` is undefined when a test router renders this component without the loader.
  const seed = loaderData as typeof loaderData | undefined
  return (
    <ProductDetailPage
      slug={params.productSlug}
      initialProduct={seed?.product}
      initialLoadedAt={seed?.loadedAt}
    />
  )
}

// Below the shell: header and footer stay, only this slot shows the error.
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  return <RouteErrorView error={error} />
}

// The title, description, canonical, Open Graph and JSON-LD are rendered by ProductSeo from the loader data (React 19
// hoists them into <head> during the server render). Returning no tags here avoids a second <title>.
export function meta() {
  return []
}
