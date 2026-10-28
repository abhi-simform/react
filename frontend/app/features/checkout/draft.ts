import { checkoutSchema, type CheckoutInput } from "./schemas"

// sessionStorage: survives a refresh, dies with the tab (a checkout is a short-lived task).
// Keyed by user id so one account never sees another's address after a sign-out/in.
const keyFor = (userId: string) => `shopsphere.checkoutDraft.${userId}`

export const DEFAULT_VALUES: Partial<CheckoutInput> = {
  addressId: "",
  pincode: "",
  method: "standard",
  slot: "",
}

/** Storage can be unavailable or hold garbage: anything that is not a valid partial draft is ignored. */
export function loadDraft(userId: string): Partial<CheckoutInput> {
  try {
    const raw = window.sessionStorage.getItem(keyFor(userId))
    if (!raw) return {}
    const parsed = checkoutSchema.partial().safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : {}
  } catch {
    return {}
  }
}

export function saveDraft(userId: string, values: unknown): void {
  try {
    window.sessionStorage.setItem(keyFor(userId), JSON.stringify(values))
  } catch {
    // private mode / quota: the form still works, it just will not survive a refresh
  }
}

export function clearDraft(userId: string): void {
  try {
    window.sessionStorage.removeItem(keyFor(userId))
  } catch {
    // nothing to clear
  }
}
