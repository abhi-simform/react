import { undoableToast } from "@/features/toast"

import { useCompareStore } from "./compareStore"

/** Remove one product from the compare list, with an Undo toast (8.5). */
export function removeFromCompare(id: string) {
  const index = useCompareStore.getState().items.findIndex((i) => i.id === id)
  const removed = useCompareStore.getState().remove(id)
  if (!removed) return
  undoableToast(`Removed ${removed.name} from compare`, () => {
    const { items, replaceAll } = useCompareStore.getState()
    if (items.some((i) => i.id === removed.id)) return
    replaceAll([...items.slice(0, index), removed, ...items.slice(index)])
  })
}

/** Empty the list; Undo puts the whole previous list back (8.5). */
export function clearCompare() {
  const previous = useCompareStore.getState().clear()
  if (previous.length === 0) return
  undoableToast("Cleared the compare list", () =>
    useCompareStore.getState().replaceAll(previous)
  )
}
