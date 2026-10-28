import { useMemo } from "react"
import { create } from "zustand"
import { createJSONStorage, devtools, persist } from "zustand/middleware"

import { env } from "@/lib/env"

import { addLine, restoreLine, setLineQty, snapshotLine } from "./lines"
import { computeTotals } from "./totals"
import type {
  CartLineInput,
  CartTotals,
  GuestCartLine,
  RemovedLine,
} from "./types"

/**
 * The guest cart + the cart drawer's UI flag (8.3): CLIENT state that several distant
 * components share (header badge, drawer, /cart page, product cards, PDP) and that must
 * survive a reload. Server data does not belong here: the logged-in cart arrives as a Query
 * in Stage 9, behind one facade hook.
 *
 * What is NOT stored: totals (derived from `lines`, see `useCartTotals`), the item count, the
 * "free shipping" progress. Stored data is the minimum from which everything else follows.
 */
export const CART_STORAGE_KEY = "shopsphere.cart"
export const CART_STORE_VERSION = 1

export type CartResult = {
  /** The quantity the line ended up with (0 = nothing added / line removed). */
  qty: number
  /** The request was cut down to the stock. */
  clamped: boolean
}

type CartState = {
  lines: GuestCartLine[]
  /** UI only, deliberately NOT persisted (a reload should not reopen the drawer). */
  drawerOpen: boolean
  add: (input: CartLineInput, qty?: number) => CartResult
  setQty: (sku: string, qty: number) => CartResult
  /** Returns what an undo needs, or undefined when the sku is not in the cart. */
  remove: (sku: string) => RemovedLine | undefined
  restore: (removed: RemovedLine) => void
  clear: () => GuestCartLine[]
  /** Put a whole cart back (undo of `clear`). */
  replaceAll: (lines: GuestCartLine[]) => void
  toggleDrawer: () => void
  setDrawerOpen: (open: boolean) => void
}

type PersistedCart = Pick<CartState, "lines">

export const useCartStore = create<CartState>()(
  devtools(
    persist(
      (set, get) => ({
        lines: [],
        drawerOpen: false,
        add: (input, qty = 1) => {
          const result = addLine(get().lines, input, qty)
          set({ lines: result.lines }, false, "cart/add")
          return { qty: result.qty, clamped: result.clamped }
        },
        setQty: (sku, qty) => {
          const result = setLineQty(get().lines, sku, qty)
          set({ lines: result.lines }, false, "cart/setQty")
          return { qty: result.qty, clamped: result.clamped }
        },
        remove: (sku) => {
          const removed = snapshotLine(get().lines, sku)
          if (removed) {
            set(
              { lines: get().lines.filter((l) => l.sku !== sku) },
              false,
              "cart/remove"
            )
          }
          return removed
        },
        restore: (removed) =>
          set(
            { lines: restoreLine(get().lines, removed) },
            false,
            "cart/restore"
          ),
        clear: () => {
          const previous = get().lines
          set({ lines: [] }, false, "cart/clear")
          return previous
        },
        replaceAll: (lines) => set({ lines }, false, "cart/replaceAll"),
        toggleDrawer: () =>
          set(
            (s) => ({ drawerOpen: !s.drawerOpen }),
            false,
            "cart/toggleDrawer"
          ),
        setDrawerOpen: (drawerOpen) =>
          set({ drawerOpen }, false, "cart/setDrawerOpen"),
      }),
      {
        name: CART_STORAGE_KEY,
        version: CART_STORE_VERSION,
        storage: createJSONStorage<PersistedCart>(() => localStorage),
        partialize: ({ lines }) => ({ lines }),
        // See `useSyncPersistedStore`: hydrating during the first client render would not
        // match the server's empty cart.
        skipHydration: true,
      }
    ),
    { name: "cart", enabled: env.DEV }
  )
)

// ---- selectors: components subscribe to the SLICE they render ----------------------------

/** Badge: number of lines. A number is compared with `Object.is`: no re-render on other changes. */
export const selectLineCount = (s: { lines: GuestCartLine[] }) => s.lines.length
export const selectLines = (s: { lines: GuestCartLine[] }) => s.lines

export function useCartLineCount(): number {
  return useCartStore(selectLineCount)
}

/**
 * Totals are DERIVED. The selector returns the stable `lines` array and `useMemo` computes the
 * totals; a selector that called `computeTotals` itself would return a NEW object on every
 * call, and zustand (via `useSyncExternalStore`) would treat each call as a changed snapshot
 * and loop ("getSnapshot should be cached" / "Maximum update depth exceeded").
 */
export function useCartTotals(): CartTotals {
  const lines = useCartStore(selectLines)
  return useMemo(() => computeTotals(lines), [lines])
}
