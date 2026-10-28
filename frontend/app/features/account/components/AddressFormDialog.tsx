import { Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import {
  Controller,
  useForm,
  useWatch,
  type Control,
  type DefaultValues,
  type UseFormClearErrors,
  type UseFormGetFieldState,
  type UseFormGetValues,
  type UseFormSetError,
  type UseFormSetValue,
} from "react-hook-form"

import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
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
import { lookupArea, PincodeStatus, usePincodeCheck } from "@/features/delivery"
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
        {/* Mounted only while open. Switching to another address calls `reset()` inside (7.4). */}
        {target !== undefined && (
          <AddressForm
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
    reset,
    control,
    clearErrors,
    setValue,
    getValues,
    getFieldState,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormInput, unknown, AddressFormOutput>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: existing ? fromAddress(existing) : EMPTY,
    // First validation when a field loses focus (not while the user is still typing a
    // pincode), then on every change until valid.
    mode: "onBlur",
  })

  // The pincode check lives in a child (so typing a pincode does not re-render this form);
  // it reports "busy" so the submit button waits for the answer (here the answer IS required).
  const [checkingPincode, setCheckingPincode] = useState(false)

  // `defaultValues` are read ONCE. When the same form instance is pointed at a different
  // address (or "new"), reset() replaces values, clears errors and the dirty state.
  const targetId = existing?.id ?? "new"
  useEffect(() => {
    reset(existing ? fromAddress(existing) : EMPTY)
    // Only the identity of the target matters; `existing` changes after every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, reset])

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
          {(control_) => (
            // A base-ui Select is not a native <select>: no `ref`/`onChange` for `register`.
            // Controller bridges: `field.value/onChange/onBlur/ref` <-> the widget's props.
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Select
                  name={field.name}
                  value={field.value ?? null}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    ref={field.ref} // so "focus the first invalid field" can focus it
                    onBlur={field.onBlur}
                    className="w-full"
                    {...control_}
                  >
                    <SelectValue placeholder="Select a state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIA_STATES.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>
      </div>
      <FormField label="Pincode" error={errors.pincode?.message}>
        {(c) => (
          <>
            <input
              className="rounded border p-1"
              inputMode="numeric"
              maxLength={6}
              autoComplete="postal-code"
              {...c}
              {...register("pincode")}
            />
            <PincodeWatch
              control={control}
              setError={setError}
              clearErrors={clearErrors}
              setValue={setValue}
              getValues={getValues}
              getFieldState={getFieldState}
              onBusyChange={setCheckingPincode}
            />
          </>
        )}
      </FormField>
      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <fieldset className="flex flex-col gap-1 text-sm">
            <legend>Address type</legend>
            <RadioGroup
              name={field.name}
              value={field.value}
              onValueChange={field.onChange}
              className="flex gap-4"
            >
              {ADDRESS_TYPES.map((t) => (
                <label key={t} className="flex items-center gap-1">
                  <RadioGroupItem value={t} onBlur={field.onBlur} />
                  {t}
                </label>
              ))}
            </RadioGroup>
          </fieldset>
        )}
      />
      {!existing && (
        <Controller
          control={control}
          name="isDefault"
          render={({ field }) => (
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                onBlur={field.onBlur}
                ref={field.ref}
              />
              Make this my default address
            </label>
          )}
        />
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={pending || isSubmitting || checkingPincode}
        >
          {(pending || isSubmitting) && (
            <Loader2 aria-hidden className="animate-spin" />
          )}
          {existing ? "Save changes" : "Add address"}
        </Button>
      </DialogFooter>
    </form>
  )
}

type WatchProps = {
  control: Control<AddressFormInput, unknown, AddressFormOutput>
  setError: UseFormSetError<AddressFormInput>
  clearErrors: UseFormClearErrors<AddressFormInput>
  setValue: UseFormSetValue<AddressFormInput>
  getValues: UseFormGetValues<AddressFormInput>
  getFieldState: UseFormGetFieldState<AddressFormInput>
  onBusyChange: (busy: boolean) => void
}

/**
 * 7.6: advisory pincode validation next to the field. Format is the schema's job (instant,
 * local); this adds "do we deliver there?" with a debounced, abortable request and:
 * - unserviceable -> `setError("pincode", { type: "serviceability" })` (cleared by the next
 *   valid answer or by any re-validation),
 * - serviceable -> clears that error and pre-fills EMPTY city/state from the local prefix stub,
 * - the server re-checks on save (`POST /addresses` answers 422 for an unserviceable pincode).
 */
function PincodeWatch({
  control,
  setError,
  clearErrors,
  setValue,
  getValues,
  getFieldState,
  onBusyChange,
}: WatchProps) {
  const pincode = useWatch({ control, name: "pincode" }) ?? ""
  const check = usePincodeCheck(pincode)
  const busy = check.status === "checking"

  useEffect(() => onBusyChange(busy), [busy, onBusyChange])

  useEffect(() => {
    // A "we do not deliver" error belongs to ONE pincode: drop it as soon as the value changes.
    if (
      check.status !== "unserviceable" &&
      getFieldState("pincode").error?.type === "serviceability"
    )
      clearErrors("pincode")
    if (check.status === "unserviceable") {
      setError("pincode", {
        type: "serviceability",
        message: "We do not deliver to this pincode yet",
      })
    } else if (check.status === "serviceable") {
      const area = lookupArea(pincode.trim())
      if (area) {
        if (!getValues("city"))
          setValue("city", area.city, { shouldValidate: true })
        if (!getValues("state"))
          setValue("state", area.state, { shouldValidate: true })
      }
    }
  }, [
    check.status,
    pincode,
    setError,
    clearErrors,
    setValue,
    getValues,
    getFieldState,
  ])

  return <PincodeStatus state={check} fieldShowsError />
}
