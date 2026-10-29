import { useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { isApiError } from "@/lib/api/errors"
import { formatRupees, parseRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"
import { refundPayment } from "./api"
import type { PaymentInfo } from "./types"

/** The amount rules, pulled out so they are unit-testable: whole rupees, 1..refundable. */
export type RefundCheck =
  { ok: true; amount: number } | { ok: false; error: string }
export function validateRefundAmount(
  input: string,
  refundable: number
): RefundCheck {
  const amount = parseRupees(input)
  if (amount === null)
    return { ok: false, error: "Enter a whole number of rupees" }
  if (amount < 1) return { ok: false, error: "The amount must be at least ₹1" }
  if (amount > refundable)
    return {
      ok: false,
      error: `At most ${formatRupees(refundable)} can still be refunded`,
    }
  return { ok: true, amount }
}

/**
 * A refund moves money, so:
 *  1. the amount is validated against what is left (partial or full),
 *  2. the button states the exact amount and says it cannot be undone,
 *  3. ONE `Idempotency-Key` (a UUID) is created when the dialog opens and reused for every
 *     submit from it: a double click or a retry after a timeout replays the same refund on the
 *     server instead of paying twice (and the button is disabled while the request runs).
 */
export function RefundDialog({
  payment,
  orderId,
  onClose,
}: {
  payment: PaymentInfo
  orderId: string
  onClose: () => void
}) {
  const key = useRef(crypto.randomUUID())
  const queryClient = useQueryClient()
  const [amountText, setAmountText] = useState(String(payment.refundable))
  const [reason, setReason] = useState("Refund by staff")
  const [error, setError] = useState<string | null>(null)
  const checked = validateRefundAmount(amountText, payment.refundable)

  const refund = useMutation({
    mutationFn: (amount: number) =>
      refundPayment(payment.id, { amount, reason }, key.current),
    onSuccess: async (_r, amount) => {
      toast.success(`Refunded ${formatRupees(amount)}`)
      await queryClient.invalidateQueries({ queryKey: qk.orders.all() })
      onClose()
    },
    onError: (e) =>
      setError(isApiError(e) ? e.message : "The refund failed. Try again."),
  })

  return (
    <Dialog open onOpenChange={(o) => !o && !refund.isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund payment</DialogTitle>
          <DialogDescription>
            Paid {formatRupees(payment.amount)}, already refunded{" "}
            {formatRupees(payment.refundedAmount)}, still refundable{" "}
            {formatRupees(payment.refundable)}.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (!checked.ok) return setError(checked.error)
            refund.mutate(checked.amount)
          }}
        >
          <Label htmlFor="refund-amount">Amount (₹, whole rupees)</Label>
          <Input
            id="refund-amount"
            inputMode="numeric"
            value={amountText}
            aria-invalid={!checked.ok}
            aria-describedby="refund-hint"
            onChange={(e) => {
              setAmountText(e.target.value)
              setError(null)
            }}
          />
          <p
            id="refund-hint"
            className={
              !checked.ok
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
          >
            {!checked.ok
              ? checked.error
              : checked.amount === payment.refundable
                ? "Full refund of what is left."
                : "Partial refund."}
          </p>
          <Label htmlFor="refund-reason">Reason</Label>
          <Input
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <p className="text-sm">
            Refunds go back to the customer's original payment method and cannot
            be undone. Order {orderId.slice(-6)}.
          </p>
          <DialogFooter>
            <Button
              type="submit"
              variant="destructive"
              disabled={refund.isPending || !checked.ok}
            >
              {refund.isPending
                ? "Refunding..."
                : `Refund ${checked.ok ? formatRupees(checked.amount) : ""}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
