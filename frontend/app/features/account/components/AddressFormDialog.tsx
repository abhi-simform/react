import { Loader2 } from "lucide-react"
import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { ApiError } from "@/lib/api/errors"

import { ADDRESS_TYPES, type Address, type AddressInput } from "../schemas"

/** Deliberately PLAIN (6.3): one `useState` object, no form library. Stage 7 rebuilds it with RHF + Zod. */
type Fields = {
  fullName: string
  phone: string
  line1: string
  line2: string
  landmark: string
  city: string
  state: string
  pincode: string
  type: AddressInput["type"]
  isDefault: boolean
}

const EMPTY: Fields = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  type: "home",
  isDefault: false,
}

const fromAddress = (a: Address): Fields => ({
  fullName: a.fullName,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  landmark: a.landmark ?? "",
  city: a.city,
  state: a.state,
  pincode: a.pincode,
  type: a.type,
  isDefault: a.isDefault,
})

/** Empty optional fields are omitted; the API would reject "" for nothing. */
function toInput(f: Fields, editing: boolean): AddressInput {
  return {
    fullName: f.fullName,
    phone: f.phone,
    line1: f.line1,
    ...(f.line2 ? { line2: f.line2 } : {}),
    ...(f.landmark ? { landmark: f.landmark } : {}),
    city: f.city,
    state: f.state,
    pincode: f.pincode,
    type: f.type,
    // PATCH cannot change the default flag (it has its own endpoint).
    ...(editing ? {} : { isDefault: f.isDefault }),
  }
}

type Props = {
  /** `undefined` = closed, `"new"` = create, an address = edit it. */
  target: Address | "new" | undefined
  pending: boolean
  onClose: () => void
  /** Resolves with the API error to show inline, or `null` on success (the parent closes us). */
  onSubmit: (
    input: AddressInput,
    existing: Address | undefined
  ) => Promise<ApiError | null>
}

export function AddressFormDialog({
  target,
  pending,
  onClose,
  onSubmit,
}: Props) {
  return (
    <Dialog
      open={target !== undefined}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent>
        {/* Mounted only while open, keyed by the target: the form state resets on every open. */}
        {target !== undefined && (
          <AddressForm
            key={target === "new" ? "new" : target.id}
            existing={target === "new" ? undefined : target}
            pending={pending}
            onSubmit={onSubmit}
            onClose={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddressForm({
  existing,
  pending,
  onSubmit,
  onClose,
}: {
  existing: Address | undefined
  pending: boolean
  onSubmit: Props["onSubmit"]
  onClose: () => void
}) {
  const [fields, setFields] = useState<Fields>(
    existing ? fromAddress(existing) : EMPTY
  )
  const [error, setError] = useState<ApiError | null>(null)
  const submitting = useRef(false) // same-tick double submit guard (state would still be stale)
  const fieldErrors = error?.fieldErrors ?? {}
  // A 422 on a field is shown under it; anything else (network, 409 limit) at the top.
  const generalError =
    error && Object.keys(fieldErrors).length === 0 ? error.message : undefined

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    const result = await onSubmit(
      toInput(fields, existing !== undefined),
      existing
    )
    if (result) setError(result)
    else onClose()
  }

  const text = (
    key: keyof Fields &
      (
        | "fullName"
        | "phone"
        | "line1"
        | "line2"
        | "landmark"
        | "city"
        | "state"
        | "pincode"
      ),
    label: string,
    extra: React.ComponentProps<"input"> = {}
  ) => (
    <label className="flex flex-col text-sm">
      {label}
      <input
        className="rounded border p-1"
        value={fields[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={fieldErrors[key] ? true : undefined}
        aria-describedby={fieldErrors[key] ? `err-${key}` : undefined}
        {...extra}
      />
      {fieldErrors[key] && (
        <span id={`err-${key}`} className="text-xs text-red-700">
          {fieldErrors[key]}
        </span>
      )}
    </label>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit address" : "Add address"}</DialogTitle>
        <DialogDescription>Where should we deliver?</DialogDescription>
      </DialogHeader>
      {generalError && (
        <p
          role="alert"
          className="rounded border border-red-300 p-2 text-sm text-red-800"
        >
          {generalError}
        </p>
      )}
      {text("fullName", "Full name", { autoComplete: "name", autoFocus: true })}
      {text("phone", "Mobile number", {
        inputMode: "numeric",
        autoComplete: "tel-national",
      })}
      {text("line1", "House, street", { autoComplete: "address-line1" })}
      {text("line2", "Area (optional)", { autoComplete: "address-line2" })}
      {text("landmark", "Landmark (optional)")}
      <div className="grid grid-cols-2 gap-2">
        {text("city", "City", { autoComplete: "address-level2" })}
        {text("state", "State", { autoComplete: "address-level1" })}
      </div>
      {text("pincode", "Pincode", {
        inputMode: "numeric",
        maxLength: 6,
        autoComplete: "postal-code",
      })}
      <label className="flex flex-col text-sm">
        Type
        <select
          className="rounded border p-1"
          value={fields.type}
          onChange={(e) => {
            const v = ADDRESS_TYPES.find((t) => t === e.target.value)
            if (v) set("type", v)
          }}
        >
          {ADDRESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {!existing && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fields.isDefault}
            onChange={(e) => set("isDefault", e.target.checked)}
          />
          Make this my default address
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 aria-hidden className="animate-spin" />}
          {existing ? "Save changes" : "Add address"}
        </Button>
      </DialogFooter>
    </form>
  )
}
