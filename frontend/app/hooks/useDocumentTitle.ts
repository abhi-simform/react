import { useEffect } from "react"

import { pageTitle } from "@/lib/pageTitle"

/**
 * For titles that depend on DATA ("iPhone 15 | ShopSphere"). A route's `meta`
 * export runs without data in SPA mode (no loaders), so the route sets a generic
 * title and this hook refines it once the product/category has loaded. The title
 * is therefore set client-side AFTER the first paint: crawlers that do not run
 * JavaScript only ever see the generic title (the SPA-mode SEO limit).
 */
export function useDocumentTitle(page: string | undefined) {
  useEffect(() => {
    if (page) document.title = pageTitle(page)
  }, [page])
}
