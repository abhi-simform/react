import { useSyncExternalStore } from "react"

import { canInstall, promptInstall, subscribePwa } from "@/lib/pwa"

/** "Install app": only where the browser offered an install prompt (`beforeinstallprompt`: Chromium). */
export function InstallButton() {
  const available = useSyncExternalStore(subscribePwa, canInstall, () => false)
  if (!available) return null
  return (
    <button
      type="button"
      className="underline"
      onClick={() => void promptInstall()}
    >
      Install app
    </button>
  )
}
