/**
 * "I clicked Helpful while signed out" (11.6): the click sends the shopper to log in; the review
 * they wanted to vote on is remembered here (per tab, `sessionStorage`, same idea as the wishlist
 * heart in 10.8) and the vote is cast once they are back signed in. Read AND removed: used once.
 */
const KEY = "shopsphere.pendingHelpful"

export function rememberHelpfulIntent(
  productId: string,
  reviewId: string
): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ productId, reviewId }))
  } catch {
    /* blocked storage: they click Helpful again after logging in */
  }
}

export function takeHelpfulIntent(productId: string): string | null {
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "productId" in parsed &&
      "reviewId" in parsed &&
      parsed.productId === productId &&
      typeof parsed.reviewId === "string"
    ) {
      window.sessionStorage.removeItem(KEY)
      return parsed.reviewId
    }
    return null
  } catch {
    return null
  }
}
