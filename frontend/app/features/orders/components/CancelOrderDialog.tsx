import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatRupees } from "@/lib/format"
import type { Order } from "@/types/domain"

import { useCancelOrder } from "../hooks/useCancelOrder"
import { CANCEL_REASONS } from "../schemas"

/** Cancel dialog with reasons; the status flips optimistically (see `useCancelOrder`). */
export function CancelOrderDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<string>(CANCEL_REASONS[0])
  const [other, setOther] = useState("")
  const [problem, setProblem] = useState<string | null>(null)
  const cancel = useCancelOrder(order._id)
  const paid =
    order.paymentMethod === "razorpay" && order.paymentStatus === "paid"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = reason === "Other" ? other.trim() : reason
    if (reason === "Other" && text.length < 3) {
      setProblem("Tell us a little more (at least 3 characters)")
      return
    }
    setProblem(null)
    cancel.mutate(text, { onSuccess: () => setOpen(false) })
    setOpen(false) // optimistic: the page already shows "Cancelled"
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Cancel order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={submit} className="flex flex-col gap-3">
            <DialogHeader>
              <DialogTitle>Cancel order {order.orderNumber}?</DialogTitle>
              <DialogDescription>
                {paid
                  ? `You paid ${formatRupees(order.pricing.total)} online; it is refunded to your original payment method.`
                  : "Stock is released and nothing will be charged."}
              </DialogDescription>
            </DialogHeader>
            <fieldset className="flex flex-col gap-1 text-sm">
              <legend className="mb-1 font-medium">
                Why are you cancelling?
              </legend>
              {CANCEL_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="cancel-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                  />
                  {r}
                </label>
              ))}
            </fieldset>
            {reason === "Other" && (
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor="cancel-other">Tell us more</label>
                <input
                  id="cancel-other"
                  className="rounded border p-1"
                  value={other}
                  onChange={(e) => setOther(e.target.value)}
                  aria-invalid={problem ? true : undefined}
                />
              </div>
            )}
            {problem && (
              <p role="alert" className="text-xs text-destructive">
                {problem}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Keep order
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={cancel.isPending}
              >
                Cancel order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
