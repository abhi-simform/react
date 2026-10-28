import { Loader2 } from "lucide-react"

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
import { useState } from "react"

import type { AddressOp } from "../hooks/useAddresses"
import type { Address } from "../schemas"

type Props = {
  address: Address
  /** The operation running on THIS row, if any. Other rows stay usable. */
  pendingOp: AddressOp | undefined
  error: string | undefined
  onEdit: (address: Address) => void
  onSetDefault: (id: string) => void
  onRemove: (id: string) => void
}

export function AddressCard({
  address: a,
  pendingOp,
  error,
  onEdit,
  onSetDefault,
  onRemove,
}: Props) {
  const [confirming, setConfirming] = useState(false)
  const busy = pendingOp !== undefined
  const spinner = (op: AddressOp) =>
    pendingOp === op && <Loader2 aria-hidden className="animate-spin" />

  return (
    <article
      aria-busy={busy}
      aria-label={`${a.type} address for ${a.fullName}`}
      className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
    >
      <header className="flex items-center gap-2">
        <h3 className="font-medium">{a.fullName}</h3>
        <span className="rounded bg-neutral-100 px-1 text-xs uppercase">
          {a.type}
        </span>
        {a.isDefault && (
          <span className="rounded bg-emerald-100 px-1 text-xs text-emerald-900">
            Default
          </span>
        )}
      </header>
      <p>
        {a.line1}
        {a.line2 ? `, ${a.line2}` : ""}
        {a.landmark ? ` (${a.landmark})` : ""}
      </p>
      <p>
        {a.city}, {a.state} {a.pincode}
      </p>
      <p>Mobile: {a.phone}</p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="mt-1 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => onEdit(a)}
        >
          Edit
        </Button>
        {!a.isDefault && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => onSetDefault(a.id)}
          >
            {spinner("default")}
            Set as default
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setConfirming(true)}
        >
          {spinner("remove")}
          Delete
        </Button>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this address?</AlertDialogTitle>
            <AlertDialogDescription>
              {a.line1}, {a.city} {a.pincode}.
              {a.isDefault &&
                " This is your default address: the newest remaining one becomes the default."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction onClick={() => onRemove(a.id)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
