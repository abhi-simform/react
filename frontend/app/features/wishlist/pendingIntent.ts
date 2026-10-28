/**
 * "I clicked the heart while signed out" (10.8). The click sends the shopper to log in; the
 * product they hearted is remembered here (per tab, `sessionStorage`) and added once they are
 * signed in. There is no guest wishlist on the server, so this one id IS the guest data.
 */
const KEY = "shopsphere.pendingWishlist"

export function rememberWishlistIntent(productId: string): void {
  try {
    window.sessionStorage.setItem(KEY, productId)
  } catch {
    /* blocked storage: the shopper just hearts it again */
  }
}

/** Reads AND removes it: it is used at most once. */
export function takeWishlistIntent(): string | null {
  try {
    const id = window.sessionStorage.getItem(KEY)
    window.sessionStorage.removeItem(KEY)
    return id
  } catch {
    return null
  }
}
