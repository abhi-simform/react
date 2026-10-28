import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { undoableToast } from "@/features/toast"
import { toApiError } from "@/lib/api/errors"
import { toPaise } from "@/lib/money"
import { toAsyncState } from "@/lib/queryState"

import {
  acknowledgeCartPrices,
  addCartItem,
  applyCoupon as applyCouponRequest,
  clearServerCart,
  removeCartItem,
  removeCoupon as removeCouponRequest,
  updateCartItem,
} from "./cart.api"
import {
  emptied,
  moveLine,
  patchQty,
  plainMessage,
  qtyBurstBase,
  qtyTimers,
  useCartMutation,
  useCartOwner,
  withoutLine,
} from "./cartMutation"
import { useCartUi } from "./cartUiStore"
import { cartQueries } from "./queries"
import { EMPTY_CART, type ServerCart, type ServerCartLine } from "./schemas"
import type { CartTotals } from "./types"

const QTY_DEBOUNCE_MS = 400

/**
 * A line as the UI renders it: the server's line, with MONEY IN PAISE (like the rest of the
 * cart layer: `computeTotals`, `formatCurrency`). The conversion happens once, here.
 */
export type CartLineView = ServerCartLine

function toView(line: ServerCartLine): CartLineView {
  return {
    ...line,
    unitPrice: toPaise(line.unitPrice),
    mrp: toPaise(line.mrp),
    previousPrice: toPaise(line.previousPrice),
  }
}

/**
 * The cart facade (9.6). Components never know whether the cart belongs to a guest (token
 * header) or a user (JWT): both are the same Query with a different owner, behind this one
 * hook. Totals (11.1): since B4 the SERVER owns the whole price (line prices incl. deals,
 * coupon discount, shipping, GST, total), so `totals` is the server's numbers converted to
 * paise, not `computeTotals`: a client-side recomputation would round differently and the order
 * total would not match. Optimistic edits patch the cached totals with the same rules
 * (`priceTotals`) until the response replaces them.
 *
 * `revalidate`: checkout asks for a fresh read on mount (`staleTime: 0`, `refetchOnMount:
 * "always"`); `revalidated` is true once that read has landed.
 */
export function useCart({ revalidate = false }: { revalidate?: boolean } = {}) {
  const { owner, ownerId, ready, key } = useCartOwner()
  const queryClient = useQueryClient()
  const query = useQuery({
    ...cartQueries.current(owner, ownerId),
    enabled: ready,
    ...(revalidate ? { staleTime: 0, refetchOnMount: "always" as const } : {}),
  })
  const cart: ServerCart = query.data ?? EMPTY_CART

  const lines = cart.items.map(toView)
  const saved = cart.saved.map(toView)
  const t = cart.totals
  const totals: CartTotals = {
    subtotal: toPaise(t.subtotal),
    discount: toPaise(t.discount),
    shipping: toPaise(t.shipping),
    tax: toPaise(t.tax),
    total: toPaise(t.total),
    // "You save": the MRP markdown (deals included) plus the coupon.
    savings: toPaise(t.mrpTotal - t.subtotal + t.discount),
  }

  const addMutation = useCartMutation<{ productId: string; qty: number }>({
    mutationFn: (o, v) => addCartItem(o, v.productId, v.qty),
    productId: (v) => v.productId,
  })
  const qtyMutation = useCartMutation<{ productId: string; qty: number }>({
    // The optimistic write already happened in `setQty`; this is the debounced request.
    mutationFn: (o, v) => updateCartItem(o, v.productId, { qty: v.qty }),
    productId: (v) => v.productId,
  })
  const removeMutation = useCartMutation<string>({
    mutationFn: (o, id) => removeCartItem(o, id),
    optimistic: withoutLine,
    productId: (id) => id,
  })
  const moveMutation = useCartMutation<{ productId: string; toSaved: boolean }>(
    {
      mutationFn: (o, v) =>
        updateCartItem(o, v.productId, { savedForLater: v.toSaved }),
      optimistic: (c, v) => moveLine(c, v.productId, v.toSaved),
      productId: (v) => v.productId,
    }
  )
  const couponMutation = useCartMutation<string>({
    mutationFn: (_o, code) => applyCouponRequest(code),
  })
  const removeCouponMutation = useCartMutation<void>({
    mutationFn: () => removeCouponRequest(),
  })
  const acknowledgeMutation = useCartMutation<void>({
    mutationFn: (o) => acknowledgeCartPrices(o),
  })
  const clearMutation = useCartMutation<void>({
    mutationFn: (o) => clearServerCart(o),
    optimistic: emptied,
  })

  const find = (productId: string) =>
    [...cart.items, ...cart.saved].find((l) => l.productId === productId)

  /** Optimistic quantity: the line changes NOW, one debounced request carries the last value. */
  function setQty(productId: string, qty: number) {
    const current = queryClient.getQueryData<ServerCart>(key)
    const now = current?.items.find((l) => l.productId === productId)?.qty
    // Only the FIRST click of a burst records the base: later clicks already see optimistic values.
    if (now !== undefined && !qtyBurstBase.has(productId))
      qtyBurstBase.set(productId, now)
    void queryClient.cancelQueries({ queryKey: key })
    queryClient.setQueryData<ServerCart>(
      key,
      (c) => c && patchQty(c, productId, qty)
    )
    clearTimeout(qtyTimers.get(productId))
    qtyTimers.set(
      productId,
      setTimeout(() => {
        qtyTimers.delete(productId)
        const before = qtyBurstBase.get(productId)
        qtyBurstBase.delete(productId)
        qtyMutation.mutateAsync({ productId, qty }).catch(() => {
          // Rollback this line to what the server had before the burst (the 409 handler
          // also refetches the truth).
          if (before !== undefined)
            queryClient.setQueryData<ServerCart>(
              key,
              (c) => c && patchQty(c, productId, before)
            )
        })
      }, QTY_DEBOUNCE_MS)
    )
  }

  async function remove(productId: string) {
    const line = find(productId)
    if (!line) return
    try {
      await removeMutation.mutateAsync(productId)
    } catch {
      return // rolled back; the global toast reported it
    }
    // Reversible, so no confirm dialog: Undo adds it back (at the END of the list: the server
    // orders lines by when they were added, so the Stage 8 "same position" restore is gone).
    undoableToast(`Removed ${line.name} from your cart`, () => {
      void (async () => {
        try {
          let restored = await addCartItem(owner, productId, line.qty)
          if (line.savedForLater)
            restored = await updateCartItem(owner, productId, {
              savedForLater: true,
            })
          queryClient.setQueryData(key, restored)
        } catch (err) {
          toast.error("Could not restore it", {
            description: toApiError(err).message,
          })
        }
      })()
    })
  }

  async function clear() {
    const previous = cart
    if (previous.items.length + previous.saved.length === 0) return
    try {
      await clearMutation.mutateAsync()
    } catch {
      return
    }
    undoableToast(
      `Removed ${previous.items.length + previous.saved.length} items from your cart`,
      () => {
        void (async () => {
          try {
            let latest: ServerCart | undefined
            for (const l of [...previous.items, ...previous.saved]) {
              latest = await addCartItem(owner, l.productId, l.qty)
              if (l.savedForLater)
                latest = await updateCartItem(owner, l.productId, {
                  savedForLater: true,
                })
            }
            if (latest) queryClient.setQueryData(key, latest)
          } catch (err) {
            toast.error("Could not restore the cart", {
              description: toApiError(err).message,
            })
          }
        })()
      }
    )
  }

  const isPending =
    addMutation.isPending ||
    qtyMutation.isPending ||
    removeMutation.isPending ||
    moveMutation.isPending ||
    couponMutation.isPending ||
    removeCouponMutation.isPending ||
    acknowledgeMutation.isPending ||
    clearMutation.isPending

  return {
    state: toAsyncState(query),
    lines,
    saved,
    totals,
    /** Lines in the cart (the header badge). */
    count: lines.length,
    hasIssues: cart.hasIssues,
    /** Lines the user must fix before checkout (out of stock / not enough left). */
    issueCount: lines.filter((l) => l.outOfStock || l.qtyReduced).length,
    /** Lines whose price moved since they were added: must be acknowledged. */
    priceChangeCount: lines.filter((l) => l.priceChanged).length,
    /** The applied coupon (or the reason it no longer applies); `null` = none. */
    coupon: cart.coupon,
    /** True once the read that started at mount (`revalidate`) has landed. */
    revalidated: query.isFetchedAfterMount,
    isPending,
    /** Rejects with the ApiError (`COUPON_INVALID` + `details.reason`): the caller words it. */
    applyCoupon: (code: string) => couponMutation.mutateAsync(code),
    removeCoupon: () => removeCouponMutation.mutateAsync(),
    acknowledgePrices: () => acknowledgeMutation.mutateAsync(),
    add: (productId: string, qty = 1) =>
      addMutation.mutateAsync({ productId, qty }),
    setQty,
    remove,
    clear,
    saveForLater: (productId: string) =>
      moveMutation.mutate({ productId, toSaved: true }),
    moveToCart: (productId: string) =>
      moveMutation.mutate({ productId, toSaved: false }),
    dismissMessage: (productId: string) =>
      useCartUi.getState().clearLineMessage(productId),
  }
}

/** Header badge: subscribes to the line COUNT only (a number), not to every cart change. */
export function useCartCount(): number {
  const { owner, ownerId, ready } = useCartOwner()
  const { data = 0 } = useQuery({
    ...cartQueries.current(owner, ownerId),
    enabled: ready,
    select: (c) => c.items.length,
  })
  return data
}

/**
 * Add to cart from cards and the PDP: a mutation only, with NO cart subscription (24 cards
 * must not each re-render when the cart changes). The 409 "not enough stock" is explained,
 * never clamped silently.
 */
export function useAddToCart() {
  const { ready } = useCartOwner()
  const mutation = useCartMutation<{ productId: string; qty: number }>({
    mutationFn: (o, v) => addCartItem(o, v.productId, v.qty),
    productId: (v) => v.productId,
  })
  return async function addToCart(productId: string, name: string, qty = 1) {
    if (!ready) {
      toast.info("Loading your session, try again in a moment")
      return false
    }
    try {
      await mutation.mutateAsync({ productId, qty })
      toast.success("Added to cart", {
        description: name,
        action: {
          label: "View cart",
          onClick: () => useCartUi.getState().setDrawerOpen(true),
        },
      })
      return true
    } catch (err) {
      const e = toApiError(err)
      if (e.code === "INSUFFICIENT_STOCK")
        toast.warning(plainMessage(e.message))
      else if (e.status === 404)
        toast.error("This product is no longer available")
      else if (e.isValidation) toast.error("Could not add it to the cart")
      // network / 5xx: the global mutation handler already toasted
      return false
    }
  }
}

// ---- cart issues (11.1) ----------------------------------------------------------------------

export type CartIssues = {
  outOfStock: { productId: string; name: string }[]
  qtyReduced: {
    productId: string
    name: string
    qty: number
    availableQty: number
  }[]
  priceChanged: {
    productId: string
    name: string
    from: number
    to: number
  }[]
  /** Anything that must be resolved (or, for prices, acknowledged) before checkout. */
  blocking: boolean
}

/** Pure: the issues of a cart, from the flags the API computes on every read. */
export function deriveIssues(cart: ServerCart): CartIssues {
  const outOfStock = cart.items
    .filter((l) => l.outOfStock)
    .map((l) => ({ productId: l.productId, name: l.name }))
  const qtyReduced = cart.items
    .filter((l) => l.qtyReduced)
    .map((l) => ({
      productId: l.productId,
      name: l.name,
      qty: l.qty,
      availableQty: l.availableQty,
    }))
  const priceChanged = cart.items
    .filter((l) => l.priceChanged)
    .map((l) => ({
      productId: l.productId,
      name: l.name,
      from: toPaise(l.previousPrice),
      to: toPaise(l.unitPrice),
    }))
  return {
    outOfStock,
    qtyReduced,
    priceChanged,
    blocking: outOfStock.length + qtyReduced.length + priceChanged.length > 0,
  }
}

/**
 * The banner's data, derived with `select`: the component re-renders only when the ISSUES change
 * (Query compares the selected value structurally), not on every quantity click.
 */
export function useCartIssues(): CartIssues {
  const { owner, ownerId, ready } = useCartOwner()
  const { data } = useQuery({
    ...cartQueries.current(owner, ownerId),
    enabled: ready,
    select: deriveIssues,
  })
  return (
    data ?? {
      outOfStock: [],
      qtyReduced: [],
      priceChanged: [],
      blocking: false,
    }
  )
}
