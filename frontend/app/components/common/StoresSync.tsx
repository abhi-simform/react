import { CART_STORAGE_KEY, useCartStore } from "@/features/cart"
import { COMPARE_STORAGE_KEY, useCompareStore } from "@/features/compare"
import { useSyncPersistedStore } from "@/lib/persistSync"

/**
 * Hydrates the persisted client stores after mount and keeps them in sync across tabs.
 * Renders nothing. One component, one place that knows every persisted store.
 */
export function StoresSync() {
  useSyncPersistedStore(useCartStore.persist, CART_STORAGE_KEY)
  useSyncPersistedStore(useCompareStore.persist, COMPARE_STORAGE_KEY)
  return null
}
