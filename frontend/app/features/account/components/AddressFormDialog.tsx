import { Loader2 } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"

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

import { PHONE_RE, PINCODE_RE } from "@/lib/fields"

import { ADDRESS_TYPES, type Address, type AddressInput } from "../schemas"

/** 7.1: the form values. Was one `useState` object in 6.3 (plain, controlled); now React Hook Form. */
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

const FIELD_NAMES = [
  "fullName",
  "phone",
  "line1",
  "line2",
  "landmark",
  "city",
  "state",
  "pincode",
] as const
type TextField = (typeof FIELD_NAMES)[number]

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
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Fields>({
    defaultValues: existing ? fromAddress(existing) : EMPTY,
  })
  // A server 422 on a field goes under that field (setError); anything else is a form-level note.
  const [generalError, setGeneralError] = useState<string>()

  async function submit(values: Fields) {
    setGeneralError(undefined)
    // RHF awaits this promise: `isSubmitting` is true until it settles, which also
    // blocks a second submit while the first request is running.
    const error = await onSubmit(
      toInput(values, existing !== undefined),
      existing
    )
    if (!error) return onClose()
    const fieldErrors = Object.entries(error.fieldErrors).filter(([path]) =>
      (FIELD_NAMES as readonly string[]).includes(path)
    )
    if (fieldErrors.length === 0) return setGeneralError(error.message)
    for (const [path, message] of fieldErrors)
      setError(path as TextField, { type: "server", message })
  }

  const text = (
    key: TextField,
    label: string,
    rules: Parameters<typeof register<TextField>>[1],
    extra: React.ComponentProps<"input"> = {}
  ) => (
    <label className="flex flex-col text-sm">
      {label}
      <input
        className="rounded border p-1"
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `err-${key}` : undefined}
        {...register(key, rules)}
        {...extra}
      />
      {errors[key] && (
        <span id={`err-${key}`} role="alert" className="text-xs text-red-700">
          {errors[key].message}
        </span>
      )}
    </label>
  )

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-2"
      noValidate
    >
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
      {text(
        "fullName",
        "Full name",
        {
          required: "Enter the recipient's name",
          minLength: { value: 2, message: "At least 2 characters" },
        },
        { autoComplete: "name", autoFocus: true }
      )}
      {text(
        "phone",
        "Mobile number",
        {
          required: "Enter a mobile number",
          pattern: {
            value: PHONE_RE,
            message: "Enter a valid 10-digit mobile number",
          },
        },
        { inputMode: "numeric", autoComplete: "tel-national" }
      )}
      {text(
        "line1",
        "House, street",
        {
          required: "Enter the house / street",
          minLength: { value: 3, message: "At least 3 characters" },
        },
        { autoComplete: "address-line1" }
      )}
      {text("line2", "Area (optional)", {}, { autoComplete: "address-line2" })}
      {text("landmark", "Landmark (optional)", {})}
      <div className="grid grid-cols-2 gap-2">
        {text(
          "city",
          "City",
          { required: "Enter the city" },
          { autoComplete: "address-level2" }
        )}
        {text(
          "state",
          "State",
          { required: "Enter the state" },
          { autoComplete: "address-level1" }
        )}
      </div>
      {text(
        "pincode",
        "Pincode",
        {
          required: "Enter a pincode",
          pattern: {
            value: PINCODE_RE,
            message: "Enter a valid 6-digit pincode",
          },
        },
        { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" }
      )}
      <label className="flex flex-col text-sm">
        Type
        <select className="rounded border p-1" {...register("type")}>
          {ADDRESS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      {!existing && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...register("isDefault")} />
          Make this my default address
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending || isSubmitting}>
          {(pending || isSubmitting) && (
            <Loader2 aria-hidden className="animate-spin" />
          )}
          {existing ? "Save changes" : "Add address"}
        </Button>
      </DialogFooter>
    </form>
  )
}
