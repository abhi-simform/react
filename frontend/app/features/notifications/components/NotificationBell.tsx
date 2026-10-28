import { Bell as BellIcon } from "lucide-react"
import { Suspense } from "react"

import { useAuth } from "@/features/auth"
import { lazyNamed } from "@/lib/lazyNamed"

// 13.3: the popover (base-ui floating-ui, ~75 kB raw), the rows and the mutations are loaded after the
// page, and never for a guest. The fallback is the same button, so the header does not move.
const BellMenu = lazyNamed(() => import("./BellMenu"), "BellMenu")

/**
 * The bell (11.9). Only mounted for signed-in users; the real component is a separate chunk.
 */
export function NotificationBell() {
  const { status } = useAuth()
  if (status !== "authenticated") return null
  return (
    <Suspense fallback={<BellPlaceholder />}>
      <BellMenu />
    </Suspense>
  )
}

function BellPlaceholder() {
  return (
    <button
      type="button"
      disabled
      aria-label="Notifications"
      className="relative rounded border px-2 py-1 text-sm"
    >
      <BellIcon aria-hidden className="size-4" />
    </button>
  )
}
