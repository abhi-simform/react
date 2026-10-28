import { Link } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import {
  CompareTable,
  selectCompareItems,
  useCompareStore,
} from "@/features/compare"
import { useProductsByIds } from "@/features/product"
import { usePersistHydrated } from "@/lib/persistSync"
import { pageTitle } from "@/lib/pageTitle"
import { paths } from "@/lib/paths"
import type { RouteHandle } from "@/types/route-handle"

/**
 * Composition only (like /wishlist): the compare store knows WHICH products (ids), the
 * product feature fetches them, the compare feature draws the table. The store keeps no
 * prices or specs, so the page always shows fresh server data.
 */
export default function CompareRoute() {
  const hydrated = usePersistHydrated(useCompareStore.persist)
  const items = useCompareStore(selectCompareItems)
  const ids = items.map((i) => i.id)
  const fetched = useProductsByIds(hydrated ? ids : [])

  let body: React.ReactNode
  if (!hydrated || (ids.length > 0 && fetched === null)) {
    body = <p role="status">Loading comparison...</p>
  } else if (items.length === 0) {
    body = (
      <EmptyState
        title="Nothing to compare yet"
        description="Use the Compare button on up to 4 products."
        action={
          <Link className="underline" to={paths.products()}>
            Browse products
          </Link>
        }
      />
    )
  } else {
    // Keep the order the user picked, and drop an id that is no longer in the store.
    const byId = new Map((fetched ?? []).map((p) => [p._id, p]))
    const products = items.flatMap((i) => byId.get(i.id) ?? [])
    body = <CompareTable products={products} />
  }
  return (
    <div className="p-4">
      <h1 className="mb-3 text-xl font-medium">Compare products</h1>
      {body}
    </div>
  )
}

export function meta() {
  return [{ title: pageTitle("Compare products") }]
}

export const handle = { breadcrumb: "Compare" } satisfies RouteHandle
