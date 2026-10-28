import { useEffect, useState } from "react"

import { getProduct, type ProductDetail } from "@/features/catalog"
import { isAbortError } from "@/lib/async"

type Settled = { key: string; products: ProductDetail[] }

/**
 * Loads products for a list of ids (the API accepts an id or slug at
 * `/products/:idOrSlug`; there is no batch endpoint yet, so one request per
 * id). Failed ids are skipped. `null` = still loading.
 */
export function useProductsByIds(
  ids: readonly string[]
): ProductDetail[] | null {
  const key = ids.join(",")
  const [settled, setSettled] = useState<Settled | null>(null)

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    Promise.allSettled(
      key.split(",").map((id) => getProduct(id, controller.signal))
    )
      .then((results) => {
        if (controller.signal.aborted) return
        setSettled({
          key,
          products: results.flatMap((r) =>
            r.status === "fulfilled" ? [r.value] : []
          ),
        })
      })
      .catch((err: unknown) => {
        if (!isAbortError(err)) console.error(err)
      })
    return () => controller.abort()
  }, [key])

  if (!key) return []
  return settled?.key === key ? settled.products : null
}
