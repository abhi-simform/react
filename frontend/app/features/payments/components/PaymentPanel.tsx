import { useInfiniteQuery } from "@tanstack/react-query"

import { Button } from "@/components/ui/button"
import { formatRupees } from "@/lib/format"

import { paymentQueries } from "../queries"
import { usePaymentFlow } from "../usePaymentFlow"
import { MockCheckoutDialog } from "./MockCheckoutDialog"

/**
 * "Pay now / Retry payment" for an online order that is still `pending_payment` (11.4). It is
 * rendered by the success page and the order page; both re-render when the polled order moves on
 * (the parent stops rendering this panel once the status is no longer `pending_payment`), so what
 * the shopper reads about the money always comes from the server, never from the Razorpay handler.
 * `extra` is a slot for the "pay another way" action of the caller.
 */
export type PayableOrder = {
  _id: string
  orderNumber: string
  paymentStatus?: string
  pricing: { total: number }
}

export function PaymentPanel({
  order,
  onCheckNow,
  extra,
}: {
  order: PayableOrder
  /** Restart the order polling (the parent owns the order query). */
  onCheckNow: () => void
  extra?: React.ReactNode
}) {
  const flow = usePaymentFlow(order._id)
  const { phase } = flow
  // The reason of the last failed attempt (also after a reload: it is server state).
  const history = useInfiniteQuery({
    ...paymentQueries.infinite({ orderId: order._id }),
    enabled: order.paymentStatus === "failed",
  })
  const lastFailure = history.data?.pages[0]?.items[0]?.failureReason
  const amount = formatRupees(order.pricing.total)
  const busy = phase.name === "starting" || phase.name === "verifying"

  const payButton = (label: string) => (
    <Button disabled={busy} onClick={() => void flow.start()}>
      {phase.name === "starting" ? "Opening payment..." : label}
    </Button>
  )

  return (
    <section
      aria-labelledby="pay-heading"
      className="flex flex-col gap-2 rounded border p-3 text-sm"
      data-testid="payment-panel"
    >
      <h2 id="pay-heading" className="font-medium">
        Payment
      </h2>

      {(phase.name === "idle" || phase.name === "starting") &&
        (order.paymentStatus === "failed" ? (
          <>
            <p role="alert" className="text-destructive">
              Your last payment attempt failed
              {lastFailure ? `: ${lastFailure}` : ""}. Nothing was charged for
              the failed attempt.
            </p>
            {payButton(`Retry payment (${amount})`)}
          </>
        ) : (
          <>
            <p>
              Your items are reserved. Complete the payment of {amount} to place
              the order.
            </p>
            {payButton(`Pay ${amount}`)}
          </>
        ))}

      {phase.name === "checkout" && !phase.options.mock && (
        <p role="status">
          The Razorpay window is open. Complete the payment there.
        </p>
      )}

      {phase.name === "verifying" && (
        <p role="status">Verifying your payment with the server...</p>
      )}

      {phase.name === "confirming" && (
        <div role="status" className="flex flex-col gap-1">
          <p data-testid="confirming">Confirming your payment...</p>
          <p className="text-xs text-muted-foreground">
            {phase.verifyFailed
              ? "We could not reach the server to verify it, but your bank may have accepted the payment. We keep checking; this page updates by itself."
              : "This usually takes a few seconds. This page updates by itself; you can also close it, the order keeps its status."}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => {
              onCheckNow()
              void flow.refetchOrder()
            }}
          >
            Check now
          </Button>
        </div>
      )}

      {phase.name === "dismissed" && (
        <>
          <p role="status" data-testid="payment-dismissed">
            Payment not completed. Your order is still waiting; nothing was
            charged.
          </p>
          {payButton(`Retry payment (${amount})`)}
        </>
      )}

      {phase.name === "failed" && (
        <>
          <p
            role="alert"
            className="text-destructive"
            data-testid="payment-failed"
          >
            Payment failed: {phase.reason}
          </p>
          {payButton(`Retry payment (${amount})`)}
        </>
      )}

      {phase.name === "mismatch" && (
        <p
          role="alert"
          className="text-destructive"
          data-testid="payment-mismatch"
        >
          We could not verify this payment. If money left your account, do not
          pay again: contact support with order number{" "}
          <strong>{order.orderNumber}</strong> and we will sort it out.
        </p>
      )}

      {phase.name === "error" && (
        <>
          <p role="alert" className="text-destructive">
            {phase.message}
          </p>
          {payButton("Try again")}
        </>
      )}

      {extra}

      {phase.name === "checkout" && phase.options.mock && (
        <MockCheckoutDialog
          options={phase.options}
          onChoose={flow.mockChoose}
          onClose={flow.dismiss}
        />
      )}
    </section>
  )
}
