import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useReducer } from "react"

import { useSingleFlight } from "@/hooks/useSingleFlight"
import { toApiError } from "@/lib/api/errors"
import { orderKeys, paymentKeys } from "@/lib/queryKeys"

import { createPaymentOrder, mockPay, verifyPayment } from "./payments.api"
import type { CheckoutOptions, MockOutcome } from "./schemas"
import { useRazorpay } from "./useRazorpay"

/**
 * The browser NEVER decides that a payment succeeded. This state machine only tracks what the
 * shopper is looking at; the order's own status (polled from the server, written by the verified
 * signature or the webhook) decides what the page says about the money.
 *
 *   idle -> starting -> checkout (modal open)
 *     checkout -> verifying -> confirming (poll the order)      handler fired
 *     checkout -> dismissed                                      modal closed, order stays pending_payment
 *     checkout -> failed                                         payment.failed event
 *     verifying -> mismatch                                      signature did not verify
 */
export type Phase =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "checkout"; options: CheckoutOptions }
  | { name: "verifying" }
  | { name: "confirming"; verifyFailed?: boolean }
  | { name: "dismissed" }
  | { name: "failed"; reason: string }
  | { name: "mismatch" }
  | { name: "error"; message: string }

type Action =
  | { type: "start" }
  | { type: "open"; options: CheckoutOptions }
  | { type: "verify" }
  | { type: "confirm"; verifyFailed?: boolean }
  | { type: "dismiss" }
  | { type: "fail"; reason: string }
  | { type: "mismatch" }
  | { type: "error"; message: string }
  | { type: "reset" }

function reducer(state: Phase, action: Action): Phase {
  switch (action.type) {
    case "start":
      return { name: "starting" }
    case "open":
      return { name: "checkout", options: action.options }
    case "verify":
      return { name: "verifying" }
    case "confirm":
      return { name: "confirming", verifyFailed: action.verifyFailed }
    case "dismiss":
      // The modal also reports a dismiss after a failure or a success: those states win.
      return state.name === "checkout" || state.name === "starting"
        ? { name: "dismissed" }
        : state
    case "fail":
      return state.name === "verifying" || state.name === "confirming"
        ? state
        : { name: "failed", reason: action.reason }
    case "mismatch":
      return { name: "mismatch" }
    case "error":
      return { name: "error", message: action.message }
    case "reset":
      return { name: "idle" }
  }
}

export function usePaymentFlow(orderId: string) {
  const queryClient = useQueryClient()
  const razorpay = useRazorpay()
  const [phase, dispatch] = useReducer(reducer, { name: "idle" })

  const refreshMoney = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
    ])

  const verify = useMutation({
    meta: { silent: true },
    mutationFn: (response: RazorpaySuccessResponse) =>
      verifyPayment(orderId, response),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: orderKeys.detail(orderId),
      })
      void refreshMoney()
    },
  })

  /** The handler fired: forward the proof to the server. Its answer, not the handler, matters. */
  async function onHandler(response: RazorpaySuccessResponse) {
    dispatch({ type: "verify" })
    try {
      await verify.mutateAsync(response)
      dispatch({ type: "confirm" })
    } catch (err) {
      const e = toApiError(err)
      if (e.code === "SIGNATURE_MISMATCH" || e.code === "ORDER_MISMATCH")
        dispatch({ type: "mismatch" })
      // Network trouble etc.: the money may well have moved, so keep polling; the webhook settles it.
      else dispatch({ type: "confirm", verifyFailed: true })
    }
  }

  function onFailed(reason: string) {
    dispatch({ type: "fail", reason })
    void refreshMoney()
  }

  const start = useSingleFlight(async () => {
    dispatch({ type: "start" })
    try {
      const options = await createPaymentOrder(orderId)
      if (options.mock) {
        dispatch({ type: "open", options })
        return
      }
      await razorpay.open(
        {
          key: options.keyId,
          amount: options.amount,
          currency: options.currency,
          name: "ShopSphere",
          description: `Order ${options.orderNumber}`,
          order_id: options.providerOrderId,
          prefill: {
            name: options.prefill.name,
            email: options.prefill.email,
            contact: options.prefill.contact,
          },
          theme: { color: "#111827" },
          handler: (r) => void onHandler(r),
          modal: { ondismiss: () => dispatch({ type: "dismiss" }) },
        },
        onFailed
      )
      dispatch({ type: "open", options })
    } catch (err) {
      const e = toApiError(err)
      dispatch({
        type: "error",
        message:
          e.code === "ORDER_NOT_PAYABLE"
            ? "This order can no longer be paid. Refresh the page."
            : e.code === "PAYMENTS_NOT_CONFIGURED"
              ? "Online payments are not available right now."
              : err instanceof Error && !(err.name === "ApiError")
                ? err.message // the script could not load
                : "We could not start the payment. Nothing was charged. Try again.",
      })
    }
  })

  /** Mock gateway "modal" buttons. */
  async function mockChoose(outcome: MockOutcome) {
    const result = await mockPay(orderId, outcome)
    if (outcome === "failure" || !result.ok) {
      onFailed(result.error?.description ?? "Payment failed")
      return
    }
    if (outcome === "success_no_callback") {
      // The shopper "closed the tab" after paying: no handler, no verify. Only polling + the webhook.
      dispatch({ type: "confirm" })
      void refreshMoney()
      return
    }
    if (result.handler) await onHandler(result.handler)
  }

  return {
    phase,
    start,
    mockChoose,
    dismiss: () => dispatch({ type: "dismiss" }),
    reset: () => dispatch({ type: "reset" }),
    razorpay,
    refetchOrder: () =>
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(orderId) }),
  }
}
