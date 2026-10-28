import { useCallback, useState } from "react"

import { loadRazorpay } from "./loadRazorpay"

/**
 * `useRazorpay()` (11.4): `{ open, ready, error }`. The script is loaded on demand (the first
 * `open`, or `preload()` when the shopper reaches the payment step), never on every render. The
 * hook only mirrors the module-level loader's state; the single-flight promise lives outside React.
 */
export function useRazorpay() {
  const [ready, setReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.Razorpay)
  )
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      await loadRazorpay()
      setReady(true)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Razorpay")
      throw e
    }
  }, [])

  /** Opens the modal. Rejects if the script cannot load (the caller shows a retry). */
  const open = useCallback(
    async (options: RazorpayOptions, onFailed: (reason: string) => void) => {
      await load()
      const RazorpayCtor = window.Razorpay
      if (!RazorpayCtor) throw new Error("Razorpay is not available")
      const instance = new RazorpayCtor(options)
      instance.on("payment.failed", (r) => onFailed(r.error.description))
      instance.open()
      return instance
    },
    [load]
  )

  // Optional warm-up so the modal opens instantly (no-op when already loaded).
  const preload = useCallback(() => {
    void load().catch(() => undefined)
  }, [load])

  return { open, preload, ready, error }
}
