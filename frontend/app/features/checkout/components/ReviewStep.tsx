import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { addressQueries } from "@/features/account"
import { useAuth } from "@/features/auth"
import { CouponBox, describeCouponReason } from "@/features/cart"
import { usePlaceOrder } from "@/features/orders"
import { Button } from "@/components/ui/button"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { formatCurrency } from "@/lib/format"
import { paths } from "@/lib/paths"

import { useCheckoutCart } from "../cartContext"
import { clearDraft } from "../draft"
import { markOrderPlaced } from "../placed"
import { checkoutSchema, type CheckoutInput } from "../schemas"
import { describeSlot } from "../slots"
import { withDelivery } from "../totals"

/**
 * Step 4: review and PLACE the order (11.3). Placing is a non-idempotent command, so:
 * - the button is disabled while the request runs AND a single-flight guard ignores a second
 *   click in the same tick (state updates after the click; a ref flips immediately);
 * - the request carries an idempotency key made once per attempt (see `orders/idempotency.ts`),
 *   so a retry after a network failure returns the first order instead of creating a second;
 * - each failure has its own outcome: stock (back to the cart), price (back to the cart), coupon,
 *   COD/pincode (back to the step to fix), network (stay, retry is safe).
 * Success navigates with `replace` so Back from the confirmation does not land on this step.
 */
export function ReviewStep() {
  const { getValues } = useFormContext<CheckoutInput>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const values = getValues()
  const addresses = useQuery(addressQueries.list())
  const address = addresses.data?.find((a) => a.id === values.addressId)
  const { totals: cartTotals, lines } = useCheckoutCart()
  const method = values.method === "express" ? "express" : "standard"
  const totals = withDelivery(cartTotals, method)
  const place = usePlaceOrder()
  const [error, setError] = useState<string | null>(null)

  function handleFailure(err: unknown) {
    const e = toApiError(err)
    const details = (e.details ?? {}) as {
      items?: { name: string; availableQty: number }[]
      reason?: string
    }
    switch (e.code) {
      case "INSUFFICIENT_STOCK": {
        const first = details.items?.[0]
        toast.error(
          first
            ? first.availableQty > 0
              ? `Only ${first.availableQty} of ${first.name} left. Update your cart.`
              : `${first.name} just went out of stock. Update your cart.`
            : "Some items are no longer available. Update your cart."
        )
        void navigate(paths.cart())
        return
      }
      case "PRICE_CHANGED":
        toast.warning(
          "Prices changed while you were checking out. Review your cart."
        )
        void navigate(paths.cart())
        return
      case "CART_EMPTY":
        void navigate(paths.cart(), { replace: true })
        return
      case "COUPON_INVALID":
        setError(
          describeCouponReason(details.reason ?? "", "Your coupon") +
            " Remove it or pick another one, then place the order again."
        )
        return
      case "COD_NOT_AVAILABLE":
        toast.error(
          "Cash on delivery is not available for this order. Choose another method."
        )
        void navigate(paths.checkoutStep("payment"))
        return
      case "PINCODE_UNSERVICEABLE":
        toast.error(
          "We do not deliver to that pincode. Choose another address."
        )
        void navigate(paths.checkoutStep("address"))
        return
      case "IDEMPOTENCY_KEY_REUSED":
        setError(
          "An order for this checkout was already placed. Check Your orders before trying again."
        )
        return
      default:
        setError(
          e.isNetwork || e.isTimeout
            ? "We could not reach the server. Your order was not lost: press Place order again, it is safe to retry."
            : "We could not place your order. Please try again."
        )
    }
  }

  const submit = useSingleFlight(async () => {
    setError(null)
    const parsed = checkoutSchema.safeParse(getValues())
    if (!parsed.success) {
      setError(
        "Some checkout details are missing. Go back and complete the steps."
      )
      return
    }
    const v = parsed.data
    try {
      const order = await place.mutateAsync({
        addressId: v.addressId,
        paymentMethod: v.payment,
        deliveryMethod: v.method,
        deliverySlot: v.slot,
        expectedTotal: Math.round(totals.total / 100),
      })
      markOrderPlaced()
      if (user) clearDraft(user.id)
      // `replace`: the review step leaves the history, so Back does not return to it.
      void navigate(paths.orderSuccess(order._id), { replace: true })
    } catch (err) {
      handleFailure(err)
    }
  })

  const row = (label: string, value: string, step: string) => (
    <div className="flex items-baseline justify-between gap-4 border-b py-1 text-sm">
      <dt className="font-medium">{label}</dt>
      <dd className="flex-1">{value}</dd>
      <Link to={`/checkout/${step}`} className="underline">
        Change
      </Link>
    </div>
  )

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-xl font-medium">Review order</h1>
      <dl>
        {row(
          "Deliver to",
          address
            ? `${address.fullName}, ${address.line1}, ${address.city} ${address.pincode}`
            : "Loading address...",
          "address"
        )}
        {row(
          "Delivery",
          `${method === "express" ? "Express" : "Standard"}, ${describeSlot(values.slot)}`,
          "delivery"
        )}
        {row(
          "Payment",
          values.payment === "cod" ? "Cash on delivery" : "Razorpay (online)",
          "payment"
        )}
      </dl>
      <section aria-label="Items">
        <h2 className="font-medium">Items</h2>
        <ul className="text-sm">
          {lines.map((l) => (
            <li
              key={l.productId}
              className="flex justify-between border-b py-1"
            >
              <span>
                {l.name} x {l.qty}
              </span>
              <span>{formatCurrency(l.unitPrice * l.qty)}</span>
            </li>
          ))}
        </ul>
      </section>
      <CouponBox />
      <p className="text-sm font-medium">
        Total to pay: {formatCurrency(totals.total)}
        {values.payment === "cod"
          ? " (cash on delivery)"
          : " (pay online on the next screen)"}
      </p>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-700"
          data-testid="place-error"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={place.isPending || lines.length === 0}
          onClick={() => void submit()}
        >
          {place.isPending
            ? "Placing order..."
            : values.payment === "cod"
              ? "Place order"
              : "Place order and continue to payment"}
        </Button>
      </div>
    </div>
  )
}
