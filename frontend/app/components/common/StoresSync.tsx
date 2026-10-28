import { COMPARE_STORAGE_KEY, useCompareStore } from "@/features/compare"
import { useSyncPersistedStore } from "@/lib/persistSync"

/**
 * Hydrates the persisted client stores (the cart is server state since 9.6; only compare is persisted) after mount and keeps them in sync across tabs.
 * Renders nothing. One component, one place that knows every persisted store.
 */
export function StoresSync() {
  useSyncPersistedStore(useCompareStore.persist, COMPARE_STORAGE_KEY)
  return null
}
