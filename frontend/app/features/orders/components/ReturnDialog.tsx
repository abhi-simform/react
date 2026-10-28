import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { addressQueries } from "@/features/account"
import {
  ImageDropzone,
  UploadStatusList,
  useUploadQueue,
} from "@/features/uploads"
import { toApiError } from "@/lib/api/errors"
import { serverMessage } from "@/lib/forms/applyApiError"
import { formatDate } from "@/lib/format"
import { orderKeys } from "@/lib/queryKeys"
import type { Order } from "@/types/domain"

import { requestReturn } from "../orders.api"
import {
  returnFormSchema,
  type ReturnFormInput,
  type ReturnFormOutput,
} from "../returnSchema"
import { RETURN_REASONS } from "../schemas"

/**
 * Return request (11.5): items + quantities with `useFieldArray` (one row per order line, the
 * quantity can never exceed what was bought: the schema AND the server check it), reason, note,
 * up to 4 photos (uploaded one by one with per-file progress, only after the form is valid) and a
 * pickup address. The refund amount is computed by the server and shown on the order afterwards.
 */
export function ReturnDialog({ order }: { order: Order }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Return items
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Return items from {order.orderNumber}</DialogTitle>
            <DialogDescription>
              {order.returnableUntil
                ? `You can return items until ${formatDate(order.returnableUntil)}.`
                : "Choose what to send back."}
            </DialogDescription>
          </DialogHeader>
          {open && <ReturnForm order={order} onDone={() => setOpen(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReturnForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const queryClient = useQueryClient()
  const addresses = useQuery(addressQueries.list())
  const uploads = useUploadQueue()
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ReturnFormInput, unknown, ReturnFormOutput>({
    resolver: zodResolver(returnFormSchema),
    defaultValues: {
      reason: undefined,
      note: "",
      pickupAddressId: "",
      photos: [],
      items: order.items.map((i) => ({
        productId: i.productId,
        title: i.title,
        bought: i.qty,
        selected: false,
        qty: i.qty,
      })),
    },
  })
  const { fields } = useFieldArray({ control, name: "items" })
  const selected = useWatch({ control, name: "items" })

  const submit = useMutation({
    meta: { silent: true },
    mutationFn: async (v: ReturnFormOutput) => {
      const urls = await uploads.uploadAll()
      if (urls === null) throw new Error("PHOTO_UPLOAD_FAILED")
      return requestReturn(order._id, {
        reason: v.reason,
        note: v.note || undefined,
        photos: urls,
        pickupAddressId: v.pickupAddressId || undefined,
        items: v.items
          .filter((i) => i.selected)
          .map((i) => ({ productId: i.productId, qty: i.qty })),
      })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(orderKeys.detail(order._id), updated)
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() })
      toast.success("Return requested")
      onDone()
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "PHOTO_UPLOAD_FAILED") {
        setError("photos", {
          message:
            "Some photos did not upload. Press Submit again to retry them.",
        })
        return
      }
      const e = toApiError(err)
      if (e.isValidation) {
        for (const [path, message] of Object.entries(e.fieldErrors))
          setError(path as never, { type: "server", message })
        return
      }
      setError("root", {
        message:
          e.code === "RETURN_WINDOW_CLOSED" || e.code === "INVALID_TRANSITION"
            ? serverMessage(e)
            : "We could not submit the return. Please try again.",
      })
    },
  })

  return (
    <form
      onSubmit={handleSubmit((v) => submit.mutate(v))}
      noValidate
      className="flex flex-col gap-3 text-sm"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-medium">What are you returning?</legend>
        {fields.map((f, n) => (
          <div key={f.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`ret-sel-${n}`}
              {...register(`items.${n}.selected`)}
            />
            <label htmlFor={`ret-sel-${n}`} className="flex-1">
              {f.title}{" "}
              <span className="text-neutral-500">(bought {f.bought})</span>
            </label>
            <label className="sr-only" htmlFor={`ret-qty-${n}`}>
              Quantity of {f.title}
            </label>
            <input
              id={`ret-qty-${n}`}
              type="number"
              min={1}
              max={f.bought}
              className="w-16 rounded border p-1"
              disabled={!selected?.[n]?.selected}
              aria-invalid={errors.items?.[n]?.qty ? true : undefined}
              {...register(`items.${n}.qty`)}
            />
          </div>
        ))}
        {errors.items?.message && (
          <p role="alert" className="text-xs text-red-700">
            {errors.items.message}
          </p>
        )}
        {errors.items?.root?.message && (
          <p role="alert" className="text-xs text-red-700">
            {errors.items.root.message}
          </p>
        )}
        {fields.map(
          (_, n) =>
            errors.items?.[n]?.qty?.message && (
              <p key={n} role="alert" className="text-xs text-red-700">
                {errors.items[n]?.qty?.message}
              </p>
            )
        )}
      </fieldset>

      <FormField label="Reason" error={errors.reason?.message}>
        {(c) => (
          <select
            className="rounded border p-1"
            defaultValue=""
            {...c}
            {...register("reason")}
          >
            <option value="" disabled>
              Choose a reason
            </option>
            {Object.entries(RETURN_REASONS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField label="Comments (optional)" error={errors.note?.message}>
        {(c) => (
          <textarea
            rows={3}
            className="rounded border p-1"
            {...c}
            {...register("note")}
          />
        )}
      </FormField>

      <Controller
        control={control}
        name="photos"
        render={({ field, fieldState }) => (
          <ImageDropzone
            label="Photos (optional, up to 4)"
            max={4}
            value={field.value ?? []}
            onChange={(files) => {
              field.onChange(files)
              uploads.setFiles(files)
            }}
            error={fieldState.error?.message}
            disabled={submit.isPending}
          />
        )}
      />
      <UploadStatusList items={uploads.items} />

      <FormField label="Pickup address">
        {(c) => (
          <select
            className="rounded border p-1"
            {...c}
            {...register("pickupAddressId")}
          >
            <option value="">
              Same as the delivery address ({order.addressSnapshot.city})
            </option>
            {addresses.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}, {a.line1}, {a.city} {a.pincode}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {errors.root?.message && (
        <p role="alert" className="text-xs text-red-700">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" disabled={submit.isPending} className="self-start">
        {submit.isPending ? "Submitting..." : "Submit return request"}
      </Button>
    </form>
  )
}
