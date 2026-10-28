import { api } from "@/lib/api/client"

import { getGuestToken, peekGuestToken } from "./cartToken"
import {
  EMPTY_CART,
  mergeResultSchema,
  serverCartSchema,
  type MergeResult,
  type ServerCart,
} from "./schemas"

/** Who the request is for: the signed-in user (Bearer) or the guest (token header). */
export type CartOwner = "user" | "guest"

const options = (owner: CartOwner) =>
  owner === "user"
    ? { auth: true as const }
    : { headers: { "x-cart-token": getGuestToken() } }

/** Reading never creates a guest token: no token yet means an empty cart without a request. */
export function getCart(
  owner: CartOwner,
  signal?: AbortSignal
): Promise<ServerCart> {
  if (owner === "guest" && !peekGuestToken()) return Promise.resolve(EMPTY_CART)
  return api("/cart", { schema: serverCartSchema, signal, ...options(owner) })
}

export const addCartItem = (
  owner: CartOwner,
  productId: string,
  qty = 1
): Promise<ServerCart> =>
  api("/cart/items", {
    method: "POST",
    body: { productId, qty },
    schema: serverCartSchema,
    ...options(owner),
  })

export const updateCartItem = (
  owner: CartOwner,
  productId: string,
  patch: { qty?: number; savedForLater?: boolean }
): Promise<ServerCart> =>
  api(`/cart/items/${encodeURIComponent(productId)}`, {
    method: "PATCH",
    body: patch,
    schema: serverCartSchema,
    ...options(owner),
  })

export const removeCartItem = (
  owner: CartOwner,
  productId: string
): Promise<ServerCart> =>
  api(`/cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    schema: serverCartSchema,
    ...options(owner),
  })

export const clearServerCart = (owner: CartOwner): Promise<ServerCart> =>
  api("/cart", {
    method: "DELETE",
    schema: serverCartSchema,
    ...options(owner),
  })

export const acknowledgeCartPrices = (owner: CartOwner): Promise<ServerCart> =>
  api("/cart/acknowledge-prices", {
    method: "POST",
    schema: serverCartSchema,
    ...options(owner),
  })

/** After login: fold the guest cart (by its token) into the signed-in user's cart. */
export const mergeGuestCart = (guestToken: string): Promise<MergeResult> =>
  api("/cart/merge", {
    method: "POST",
    body: { guestToken },
    schema: mergeResultSchema,
    auth: true,
  })
