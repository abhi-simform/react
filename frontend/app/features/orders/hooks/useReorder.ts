import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { addCartItem } from "@/features/cart"
import { toApiError } from "@/lib/api/errors"
import { cartKeys } from "@/lib/queryKeys"
import type { Order } from "@/types/domain"

type Outcome = {
  added: string[]
  unavailable: { title: string; why: string }[]
}

/**
 * "Buy again": add every line of an old order to the cart, ONE request per line (the cart
 * endpoint takes one product), and report what could not be added (gone, out of stock) instead of
 * failing the whole thing. The cart is refetched once at the end.
 */
export function useReorder() {
  const queryClient = useQueryClient()
  return useMutation({
    meta: { silent: true },
    mutationFn: async (order: Order): Promise<Outcome> => {
      const out: Outcome = { added: [], unavailable: [] }
      for (const item of order.items) {
        try {
          await addCartItem("user", item.productId, item.qty)
          out.added.push(item.title)
        } catch (err) {
          const e = toApiError(err)
          out.unavailable.push({
            title: item.title,
            why:
              e.code === "INSUFFICIENT_STOCK"
                ? "not enough stock"
                : e.status === 404
                  ? "no longer sold"
                  : "could not be added",
          })
        }
      }
      return out
    },
    onSuccess: (out) => {
      if (out.unavailable.length === 0)
        toast.success(`Added ${out.added.length} item(s) to your cart`)
      else
        toast.warning(
          `Added ${out.added.length} of ${out.added.length + out.unavailable.length}. Unavailable: ${out.unavailable.map((u) => `${u.title} (${u.why})`).join(", ")}`
        )
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: cartKeys.all }),
  })
}
