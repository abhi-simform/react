import { create } from "zustand"
import { devtools } from "zustand/middleware"

import { env } from "@/lib/env"

/**
 * What is LEFT of the Zustand cart store after 9.6: CLIENT state only. The lines moved to the
 * server cart (Query). Why these two stay here:
 * - `drawerOpen`: product cards' "View cart" toast action opens the drawer from far away; a
 *   reload must not reopen it, so it is not persisted.
 * - `lineMessages`: the warning shown on a line after a 409 (stock changed). It describes what
 *   happened to a user ACTION, not server data, and it disappears with the next success.
 */
type CartUi = {
  drawerOpen: boolean
  lineMessages: Record<string, string>
  toggleDrawer: () => void
  setDrawerOpen: (open: boolean) => void
  setLineMessage: (productId: string, message: string) => void
  clearLineMessage: (productId: string) => void
  clearAllMessages: () => void
}

export const useCartUi = create<CartUi>()(
  devtools(
    (set) => ({
      drawerOpen: false,
      lineMessages: {},
      toggleDrawer: () =>
        set((s) => ({ drawerOpen: !s.drawerOpen }), false, "cart/toggleDrawer"),
      setDrawerOpen: (drawerOpen) =>
        set({ drawerOpen }, false, "cart/setDrawerOpen"),
      setLineMessage: (productId, message) =>
        set(
          (s) => ({
            lineMessages: { ...s.lineMessages, [productId]: message },
          }),
          false,
          "cart/lineMessage"
        ),
      clearAllMessages: () =>
        set({ lineMessages: {} }, false, "cart/clearAllMessages"),
      clearLineMessage: (productId) =>
        set(
          ({ lineMessages: { [productId]: _gone, ...rest } }) => ({
            lineMessages: rest,
          }),
          false,
          "cart/clearLineMessage"
        ),
    }),
    { name: "cart-ui", enabled: env.DEV }
  )
)
