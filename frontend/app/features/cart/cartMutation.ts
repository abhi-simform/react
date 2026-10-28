import { useMutation, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/features/auth"
import { toApiError } from "@/lib/api/errors"
import { cartKeys } from "@/lib/queryKeys"

import type { CartOwner } from "./cart.api"
import { useCartUi } from "./cartUiStore"
import type { ServerCart, ServerCartLine } from "./schemas"

/**
 * Who owns the cart RIGHT NOW. A signed-in user = the JWT cart; everyone else = the guest cart
 * (token header). `ready` is false while the session is being restored: the owner is not known
 * yet, and asking early would show (or create) the wrong cart.
 */
export function useCartOwner() {
  const { status, user } = useAuth()
  const owner: CartOwner = status === "authenticated" ? "user" : "guest"
  const ownerId = user?.id ?? "guest"
  return {
    owner,
    ownerId,
    ready: status !== "loading",
    key: cartKeys.current(owner === "user" ? ownerId : "guest"),
  }
}

/** `ApiError.message` is "HTTP 409: Only 1 left"; the shopper should read just the sentence. */
export const plainMessage = (message: string) =>
  message.replace(/^HTTP \d+: /, "")

// ---- pure cache patches (always return a NEW object: never mutate cached data) ----------

function recount(
  items: ServerCartLine[],
  saved: ServerCartLine[],
  cart: ServerCart
) {
  const payable = (l: ServerCartLine) => Math.min(l.qty, l.availableQty)
  const subtotal = items.reduce((s, l) => s + l.unitPrice * payable(l), 0)
  const mrpTotal = items.reduce((s, l) => s + l.mrp * payable(l), 0)
  return {
    ...cart,
    items,
    saved,
    totals: {
      lineCount: items.length,
      unitCount: items.reduce((s, l) => s + payable(l), 0),
      subtotal,
      mrpTotal,
      savings: mrpTotal - subtotal,
    },
  }
}

export const patchQty = (cart: ServerCart, productId: string, qty: number) =>
  recount(
    cart.items.map((l) => (l.productId === productId ? { ...l, qty } : l)),
    cart.saved,
    cart
  )

export const withoutLine = (cart: ServerCart, productId: string) =>
  recount(
    cart.items.filter((l) => l.productId !== productId),
    cart.saved.filter((l) => l.productId !== productId),
    cart
  )

/** Move a line between the cart and "saved for later" (keeps its position at the END of the target list). */
export function moveLine(
  cart: ServerCart,
  productId: string,
  toSaved: boolean
) {
  const line = [...cart.items, ...cart.saved].find(
    (l) => l.productId === productId
  )
  if (!line) return cart
  const moved = { ...line, savedForLater: toSaved }
  const items = cart.items.filter((l) => l.productId !== productId)
  const saved = cart.saved.filter((l) => l.productId !== productId)
  return toSaved
    ? recount(items, [...saved, moved], cart)
    : recount([...items, moved], saved, cart)
}

export const emptied = (cart: ServerCart) => recount([], [], cart)

// ---- the shared mutation shape ---------------------------------------------------------------

/**
 * Pending quantity edits (9.5): a stepper click updates the cache at once and arms a 400 ms
 * timer per line; only the LAST value of a burst is sent. While any timer is armed, a server
 * response must not be written into the cache: it would overwrite the optimistic quantity of a
 * line the user is still editing. (Module level: the timers outlive a re-rendering component.)
 */
export const qtyTimers = new Map<string, ReturnType<typeof setTimeout>>()
/** Per line: the quantity BEFORE the first click of the current burst (what a failed request rolls back to). */
export const qtyBurstBase = new Map<string, number>()

type Config<V> = {
  mutationFn: (owner: CartOwner, vars: V) => Promise<ServerCart>
  /** Patch the cached cart BEFORE the request (rolled back from a snapshot on error). */
  optimistic?: (cart: ServerCart, vars: V) => ServerCart
  /** For the 409 line message and clearing it again. */
  productId?: (vars: V) => string | undefined
}

/**
 * One cart mutation, in the order Query runs it:
 * `onMutate`: cancel in-flight cart refetches (they could land after our optimistic write and
 * undo it), snapshot, apply the optimistic patch -> request -> `onSuccess`: the response IS the
 * whole new cart, so write it into the cache (no extra GET), but only when this is the LAST
 * cart mutation still running (an older response must not overwrite a newer optimistic state:
 * "last response wins") -> `onError`: restore the snapshot; a 409 (stock changed) puts a
 * warning on that line and refetches the truth; everything else is left to the global toast.
 */
export function useCartMutation<V>(config: Config<V>) {
  const { owner, key } = useCartOwner()
  const queryClient = useQueryClient()
  const lastOne = () =>
    queryClient.isMutating({ mutationKey: cartKeys.all }) <= 1 &&
    qtyTimers.size === 0

  return useMutation({
    mutationKey: [...cartKeys.all, "mutate"],
    mutationFn: (vars: V) => config.mutationFn(owner, vars),
    onMutate: async (vars: V) => {
      if (!config.optimistic) return { snapshot: undefined }
      await queryClient.cancelQueries({ queryKey: key })
      const snapshot = queryClient.getQueryData<ServerCart>(key)
      if (snapshot)
        queryClient.setQueryData(key, config.optimistic(snapshot, vars))
      return { snapshot }
    },
    onSuccess: (cart, vars) => {
      const id = config.productId?.(vars)
      if (id) useCartUi.getState().clearLineMessage(id)
      if (lastOne()) queryClient.setQueryData(key, cart)
    },
    onError: (error, vars, context) => {
      if (context?.snapshot) queryClient.setQueryData(key, context.snapshot)
      const e = toApiError(error)
      const id = config.productId?.(vars)
      if (e.code === "INSUFFICIENT_STOCK" && id)
        useCartUi.getState().setLineMessage(id, plainMessage(e.message))
      // 409 = our numbers were stale: refetch the truth.
      if (e.status === 409 && lastOne())
        void queryClient.invalidateQueries({ queryKey: key })
    },
  })
}
