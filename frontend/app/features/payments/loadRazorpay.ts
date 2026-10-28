const SRC = "https://checkout.razorpay.com/v1/checkout.js"

/**
 * Load `checkout.js` ONCE per page life. The promise is module-level ("single flight"): ten
 * callers, StrictMode's double effects and every retry share one `<script>`. A failed load
 * resets it, so the next click can try again (and the dead tag is removed, not duplicated).
 */
let inflight: Promise<void> | null = null

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("Razorpay needs a browser"))
  if (window.Razorpay) return Promise.resolve()
  if (inflight) return inflight
  inflight = new Promise<void>((resolve, reject) => {
    const tag = document.createElement("script")
    tag.src = SRC
    tag.async = true
    tag.dataset.razorpay = "checkout"
    tag.onload = () => {
      if (window.Razorpay) resolve()
      else {
        inflight = null
        reject(new Error("Razorpay did not initialise"))
      }
    }
    tag.onerror = () => {
      tag.remove()
      inflight = null
      reject(new Error("Could not load the Razorpay checkout script"))
    }
    document.head.appendChild(tag)
  })
  return inflight
}

/** Dev lab: how many checkout script tags exist (must never exceed 1). */
export const razorpayScriptCount = () =>
  document.querySelectorAll('script[data-razorpay="checkout"]').length
