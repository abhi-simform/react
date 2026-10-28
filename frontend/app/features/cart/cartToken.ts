/**
 * The guest cart's identity (9.6): a random id the SERVER keys the guest cart by (sent as the
 * `x-cart-token` header). It names a cart, it is not a credential, so `localStorage` is fine:
 * it survives reload and browser restarts (acceptance: the guest cart survives), and every tab
 * of the same browser shares it. After login the cart is merged into the user's and the token
 * is dropped; the next guest session mints a new one.
 * Every access is wrapped: storage can be blocked (private mode) or absent (prerender).
 */
const KEY = "shopsphere.cartToken"

export function peekGuestToken(): string | null {
  try {
    return window.localStorage.getItem(KEY)
  } catch {
    return null
  }
}

/** The token, created on first use (a guest who never adds anything never gets one). */
export function getGuestToken(): string {
  const existing = peekGuestToken()
  if (existing) return existing
  const token = crypto.randomUUID()
  try {
    window.localStorage.setItem(KEY, token)
  } catch {
    /* blocked storage: this tab's token is lost on reload; the cart is then per-visit */
  }
  return token
}

export function clearGuestToken(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* nothing to clear */
  }
}
