import { useCallback } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"

const KEY = "shopsphere.recentlyViewed"
const MAX_ITEMS = 12

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string")

/**
 * The GUEST "recently viewed": product ids, most recent first, unique, capped at 12, in
 * localStorage. A signed-in user's list is on the server; this one is merged into it on login
 * (`RecentlyViewedSync`) and then emptied.
 */
export function useLocalViews() {
  const [ids, setIds, clear] = useLocalStorage<string[]>(KEY, [], isIdList)
  const push = useCallback(
    (id: string) =>
      setIds((prev) =>
        [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS)
      ),
    [setIds]
  )
  return { ids, push, clear }
}
