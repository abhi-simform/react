import { useEffect, useSyncExternalStore } from "react"
import { toast } from "sonner"

import {
  applyUpdate,
  isUpdateWaiting,
  registerServiceWorker,
  subscribePwa,
} from "@/lib/pwa"

const UPDATE_TOAST = "pwa-update"

/**
 * Mounted once in the root (renders nothing). Registers the service worker and, when a new version has
 * been downloaded and is waiting, shows ONE persistent toast with a Reload button. A new deployment is
 * therefore never forced on the user mid-checkout, but is never ignored either.
 */
export function PwaSync() {
  useEffect(() => registerServiceWorker(), [])
  const updateWaiting = useSyncExternalStore(
    subscribePwa,
    isUpdateWaiting,
    () => false
  )
  useEffect(() => {
    if (!updateWaiting) return
    toast("A new version of ShopSphere is available", {
      id: UPDATE_TOAST,
      duration: Infinity,
      action: { label: "Reload", onClick: applyUpdate },
    })
    return () => void toast.dismiss(UPDATE_TOAST)
  }, [updateWaiting])
  return null
}
