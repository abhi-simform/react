import { Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type DefaultValues } from "react-hook-form"

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

import { FormError } from "@/components/form/FormError"
import { FormField } from "@/components/form/FormField"
import { useSingleFlight } from "@/hooks/useSingleFlight"
import { applyApiError } from "@/lib/forms/applyApiError"
import { INDIA_STATES, isIndiaState } from "@/lib/indiaStates"

import {
  ADDRESS_TYPES,
  addressFormSchema,
  type Address,
  type AddressFormInput,
  type AddressFormOutput,
  type AddressInput,
} from "../schemas"

/** `DefaultValues` is a deep partial: a field may start `undefined` (no state chosen). */
const EMPTY: DefaultValues<AddressFormInput> = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: undefined, // no state chosen yet ("" is not one of the enum values)
  pincode: "",
  type: "home",
  isDefault: false,
}

const fromAddress = (a: Address): DefaultValues<AddressFormInput> => ({
  fullName: a.fullName,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 ?? "",
  landmark: a.landmark ?? "",
  city: a.city,
  // The API accepts any text; the form only offers the list. An unknown legacy value
  // starts unselected so the user must pick one.
  state: isIndiaState(a.state) ? a.state : undefined,
  pincode: a.pincode,
  type: a.type,
  isDefault: a.isDefault,
})

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

const FIELDS = [
  "fullName",
  "phone",
  "line1",
  "line2",
  "landmark",
  "city",
  "state",
  "pincode",
] as const

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
  } = useForm<AddressFormInput, unknown, AddressFormOutput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: existing ? fromAddress(existing) : EMPTY,
  })

  // Single flight: a same-tick second submit (Enter + click) never reaches the API.
  const save = useSingleFlight(async (values: AddressFormOutput) => {
    // PATCH cannot change the default flag (it has its own endpoint).
    const { isDefault, ...rest } = values
    const input: AddressInput = existing ? rest : { ...rest, isDefault }
    // RHF awaits this promise: `isSubmitting` is true until it settles.
    const error = await onSubmit(input, existing)
    if (!error) return onClose()
    // 422 details -> under each field (the first is focused); 409/limit/network -> form level.
    applyApiError(error, setError, { fields: FIELDS })
  })
  const submit = handleSubmit(save)

  const text = (
    key: Exclude<(typeof FIELDS)[number], "state">,
    label: string,
    extra: React.ComponentProps<"input"> = {}
  ) => (
    <FormField label={label} error={errors[key]?.message}>
      {(control) => (
        <input
          className="rounded border p-1"
          {...control}
          {...register(key)}
          {...extra}
        />
      )}
    </FormField>
  )

  return (
    <form onSubmit={submit} className="flex flex-col gap-2" noValidate>
      <DialogHeader>
        <DialogTitle>{existing ? "Edit address" : "Add address"}</DialogTitle>
        <DialogDescription>Where should we deliver?</DialogDescription>
      </DialogHeader>
      <FormError
        error={errors.root?.server}
        onRetry={() => void submit()}
        retrying={isSubmitting}
      />
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
        <FormField label="State" error={errors.state?.message}>
          {(control) => (
            <select
              className="rounded border p-1"
              {...control}
              {...register("state")}
            >
              <option value="">Select...</option>
              {INDIA_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}
        </FormField>
      </div>
      {text("pincode", "Pincode", {
        inputMode: "numeric",
        maxLength: 6,
        autoComplete: "postal-code",
      })}
      <FormField label="Type">
        {(control) => (
          <select
            className="rounded border p-1"
            {...control}
            {...register("type")}
          >
            {ADDRESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </FormField>
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
