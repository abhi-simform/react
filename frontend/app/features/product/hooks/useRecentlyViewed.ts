import { useCallback } from "react"

import { useLocalStorage } from "@/hooks/useLocalStorage"

const KEY = "shopsphere.recentlyViewed"
const MAX_ITEMS = 12

const isIdList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === "string")

/** Guest "recently viewed": product ids, most recent first, unique, capped at 12. */
export function useRecentlyViewed() {
  const [ids, setIds] = useLocalStorage<string[]>(KEY, [], isIdList)

  const push = useCallback(
    (id: string) =>
      setIds((prev) =>
        [id, ...prev.filter((x) => x !== id)].slice(0, MAX_ITEMS)
      ),
    [setIds]
  )
  return { ids, push }
}
