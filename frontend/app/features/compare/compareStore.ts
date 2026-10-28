import { create } from "zustand"
import { createJSONStorage, devtools, persist } from "zustand/middleware"

import { env } from "@/lib/env"

/**
 * The compare list (8.3): up to 4 products, client-only, persisted. It keeps the MINIMUM per
 * product (id + a label and picture for the tray): the comparison page fetches the real
 * product data by id, so prices and specs are never copied here to go stale.
 */
export const COMPARE_STORAGE_KEY = "shopsphere.compare"
export const COMPARE_MAX = 4

export type CompareItem = {
  id: string
  slug: string
  name: string
  imageUrl: string
}

export type ToggleOutcome = "added" | "removed" | "full"

type CompareState = {
  items: CompareItem[]
  /** Adds, or removes when already there. At the limit, an add is refused ("full"). */
  toggle: (item: CompareItem) => ToggleOutcome
  remove: (id: string) => CompareItem | undefined
  clear: () => CompareItem[]
  /** Put a list back (undo of `clear`). */
  replaceAll: (items: CompareItem[]) => void
}

type PersistedCompare = Pick<CompareState, "items">

export const useCompareStore = create<CompareState>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        toggle: (item) => {
          const { items } = get()
          if (items.some((i) => i.id === item.id)) {
            set(
              { items: items.filter((i) => i.id !== item.id) },
              false,
              "compare/toggle:remove"
            )
            return "removed"
          }
          if (items.length >= COMPARE_MAX) return "full"
          set({ items: [...items, item] }, false, "compare/toggle:add")
          return "added"
        },
        remove: (id) => {
          const found = get().items.find((i) => i.id === id)
          if (found) {
            set(
              { items: get().items.filter((i) => i.id !== id) },
              false,
              "compare/remove"
            )
          }
          return found
        },
        clear: () => {
          const previous = get().items
          set({ items: [] }, false, "compare/clear")
          return previous
        },
        replaceAll: (items) =>
          set(
            { items: items.slice(0, COMPARE_MAX) },
            false,
            "compare/replaceAll"
          ),
      }),
      {
        name: COMPARE_STORAGE_KEY,
        version: 1,
        storage: createJSONStorage<PersistedCompare>(() => localStorage),
        partialize: ({ items }) => ({ items }),
        skipHydration: true,
      }
    ),
    { name: "compare", enabled: env.DEV }
  )
)

export const selectCompareItems = (s: { items: CompareItem[] }) => s.items
export const selectCompareCount = (s: { items: CompareItem[] }) =>
  s.items.length
/** A boolean per product: only the card whose answer flips re-renders. */
export const selectIsComparing =
  (id: string) => (s: { items: CompareItem[] }) =>
    s.items.some((i) => i.id === id)
