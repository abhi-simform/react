import { useState } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { staffActions, STATUS_LABEL, type StaffAction } from "./transitions"
import type { OrderStatus } from "./types"

export type StatusSubmit = {
  status: OrderStatus
  note?: string
  shipment?: { carrier: string; trackingId: string }
}

type Props = {
  status: OrderStatus
  orderNumber: string
  /** True while a status request is in flight: every button is disabled (no double submit). */
  busy?: boolean
  onSubmit: (input: StatusSubmit) => void
}

/**
 * The status action bar: it renders ONLY the moves the state machine allows from the current
 * status (`staffActions`). Illegal moves are not offered; if one is forced anyway (DevTools, a
 * stale tab), the API answers 409 INVALID_TRANSITION and the page shows that message.
 */
export function OrderStatusBar({ status, orderNumber, busy, onSubmit }: Props) {
  const [action, setAction] = useState<StaffAction | null>(null)
  const actions = staffActions(status)
  if (actions.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        {STATUS_LABEL[status]}: no further staff actions.
      </p>
    )
  const close = () => setAction(null)
  return (
    <>
      <div
        role="group"
        aria-label="Order actions"
        className="flex flex-wrap items-center gap-2"
      >
        {actions.map((a) => (
          <Button
            key={a.to}
            variant={a.destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={() =>
              a.kind === "simple" ? onSubmit({ status: a.to }) : setAction(a)
            }
          >
            {a.label}
          </Button>
        ))}
      </div>
      {action?.kind === "ship" ? (
        <ShipDialog
          orderNumber={orderNumber}
          busy={busy}
          onClose={close}
          onSubmit={(shipment) => {
            onSubmit({ status: action.to, shipment })
            close()
          }}
        />
      ) : null}
      {action?.kind === "cancel" ? (
        <ReasonDialog
          action={action}
          orderNumber={orderNumber}
          onClose={close}
          onSubmit={(note) => {
            onSubmit({ status: action.to, note })
            close()
          }}
        />
      ) : null}
      {action?.kind === "confirm" ? (
        <AlertDialog open onOpenChange={(o) => !o && close()}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {action.label.replace("...", "")}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Order {orderNumber}. {action.description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onSubmit({ status: action.to })
                  close()
                }}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </>
  )
}

const CARRIERS = [
  "Delhivery",
  "Blue Dart",
  "India Post",
  "Ecom Express",
  "Other",
]

function ShipDialog({
  orderNumber,
  busy,
  onClose,
  onSubmit,
}: {
  orderNumber: string
  busy?: boolean
  onClose: () => void
  onSubmit: (s: { carrier: string; trackingId: string }) => void
}) {
  const [carrier, setCarrier] = useState(CARRIERS[0])
  const [trackingId, setTrackingId] = useState("")
  const [error, setError] = useState<string | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ship order {orderNumber}</DialogTitle>
          <DialogDescription>
            The customer sees the carrier and tracking id on their order.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (trackingId.trim().length < 3)
              return setError("Enter the tracking id (at least 3 characters)")
            onSubmit({ carrier, trackingId: trackingId.trim() })
          }}
        >
          <Label htmlFor="ship-carrier">Carrier</Label>
          <select
            id="ship-carrier"
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          >
            {CARRIERS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <Label htmlFor="ship-tracking">Tracking id</Label>
          <Input
            id="ship-tracking"
            value={trackingId}
            aria-invalid={!!error}
            aria-describedby={error ? "ship-error" : undefined}
            onChange={(e) => setTrackingId(e.target.value)}
          />
          {error ? (
            <p
              id="ship-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={busy}>
              Mark shipped
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ReasonDialog({
  action,
  orderNumber,
  onClose,
  onSubmit,
}: {
  action: StaffAction
  orderNumber: string
  onClose: () => void
  onSubmit: (note: string) => void
}) {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const title = action.label.replace("...", "")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {title}: {orderNumber}
          </DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (note.trim().length < 3)
              return setError("Give a reason (at least 3 characters)")
            onSubmit(note.trim())
          }}
        >
          <Label htmlFor="reason">Reason (the customer sees it)</Label>
          <Textarea
            id="reason"
            value={note}
            aria-invalid={!!error}
            aria-describedby={error ? "reason-error" : undefined}
            onChange={(e) => setNote(e.target.value)}
          />
          {error ? (
            <p
              id="reason-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="submit" variant="destructive">
              {title}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
