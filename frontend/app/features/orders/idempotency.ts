/**
 * The idempotency key of the CURRENT checkout attempt (11.3). It is generated ONCE (the first time
 * the shopper presses "Place order") and kept in sessionStorage, so every retry of the same attempt
 * (network failure, double click, a refresh, a login in the middle) sends the SAME key and the
 * server returns the first order instead of creating another. It is dropped when the order is
 * placed: the next checkout is a new attempt with a new key. Per user, so accounts never share.
 */
const keyFor = (userId: string) => `shopsphere.orderKey.${userId}`

export function getAttemptKey(userId: string): string {
  try {
    const existing = window.sessionStorage.getItem(keyFor(userId))
    if (existing) return existing
  } catch {
    /* blocked storage: fall through, this attempt just cannot survive a refresh */
  }
  const key = crypto.randomUUID()
  try {
    window.sessionStorage.setItem(keyFor(userId), key)
  } catch {
    /* ignore */
  }
  return key
}

export function clearAttemptKey(userId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(userId))
  } catch {
    /* nothing to clear */
  }
}
