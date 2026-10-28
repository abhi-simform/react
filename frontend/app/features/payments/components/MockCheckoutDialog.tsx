import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatRupees } from "@/lib/format"

import type { CheckoutOptions, MockOutcome } from "../schemas"

/**
 * Stands in for Razorpay's modal when the backend runs its MOCK gateway (no keys). It drives the
 * same code path as the real one: the browser reports an outcome to the backend, which signs the
 * handler payload and delivers a webhook. The third button simulates the nastiest real-world
 * case: the shopper pays and the tab dies before the browser callback arrives.
 */
export function MockCheckoutDialog({
  options,
  onChoose,
  onClose,
}: {
  options: CheckoutOptions
  onChoose: (outcome: MockOutcome) => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState<MockOutcome | null>(null)
  async function choose(outcome: MockOutcome) {
    setBusy(outcome)
    try {
      await onChoose(outcome)
    } finally {
      setBusy(null)
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent data-testid="mock-gateway">
        <DialogHeader>
          <DialogTitle>Mock payment gateway</DialogTitle>
          <DialogDescription>
            Test mode, no money moves. Order {options.orderNumber}:{" "}
            {formatRupees(options.amount / 100)}. Provider order{" "}
            <code>{options.providerOrderId}</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Button
            disabled={busy !== null}
            onClick={() => void choose("success")}
          >
            {busy === "success" ? "Paying..." : "Pay with test card (success)"}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void choose("failure")}
          >
            {busy === "failure"
              ? "Paying..."
              : "Pay with failing card (declined)"}
          </Button>
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void choose("success_no_callback")}
          >
            {busy === "success_no_callback"
              ? "Paying..."
              : "Pay, then lose the browser callback (tab closed)"}
          </Button>
          <Button variant="ghost" disabled={busy !== null} onClick={onClose}>
            Close without paying
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
