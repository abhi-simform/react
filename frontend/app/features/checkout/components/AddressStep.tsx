import { MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import { useFormContext } from "react-hook-form"
import { toast } from "sonner"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import {
  AddressFormDialog,
  createAddress,
  addressQueries,
  type Address,
  type AddressInput,
} from "@/features/account"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toApiError, type ApiError } from "@/lib/api/errors"
import { addressKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"

import type { CheckoutInput } from "../schemas"

/** Step 1: pick a saved address or add a new one (the same dialog and API as /account/addresses). */
export function AddressStep() {
  const queryClient = useQueryClient()
  const list = toAsyncState(useQuery(addressQueries.list()))
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
  } = useFormContext<CheckoutInput>()
  const [adding, setAdding] = useState(false)

  // A draft can name an address that was deleted meanwhile: forget it.
  const loaded = list.status === "success" ? list.data : undefined
  useEffect(() => {
    if (loaded && !loaded.some((a) => a.id === getValues("addressId"))) {
      setValue("addressId", "")
      setValue("pincode", "")
    }
  }, [loaded, getValues, setValue])

  async function saveNew(input: AddressInput): Promise<ApiError | null> {
    try {
      const created = await createAddress(input)
      await queryClient.invalidateQueries({ queryKey: addressKeys.all })
      select(created)
      toast.success("Address added")
      return null
    } catch (err) {
      return toApiError(err)
    }
  }

  /**
   * Copy the chosen address's pincode for the later steps. ONE handler for the whole radio
   * group: RHF keeps only the options of the LAST `register("addressId", ...)` call, so a
   * per-radio closure (`onChange: () => setValue("pincode", a.pincode)`) would always use
   * the last address's pincode. (That was my first version; it copied the wrong pincode.)
   */
  const copyPincode =
    (items: readonly Address[]) => (event: { target: { value: string } }) => {
      const picked = items.find((a) => a.id === event.target.value)
      if (picked) setValue("pincode", picked.pincode)
    }

  function select(address: Address) {
    setValue("addressId", address.id, { shouldValidate: true })
    setValue("pincode", address.pincode)
  }

  return (
    <div>
      <h1 className="mb-2 text-xl font-medium">Delivery address</h1>
      <AsyncView
        state={list}
        loading={<ListSkeleton rows={2} label="Loading addresses" />}
        empty={(items) =>
          items.length === 0 && (
            <EmptyState
              icon={<MapPin className="size-8" />}
              title="No saved addresses yet"
              description="Add the address we should deliver to."
              action={
                <Button type="button" onClick={() => setAdding(true)}>
                  Add address
                </Button>
              }
            />
          )
        }
      >
        {(items) => (
          <fieldset
            aria-describedby={errors.addressId ? "address-error" : undefined}
            className="flex flex-col gap-2"
          >
            <legend className="mb-1 text-sm font-medium">
              Choose where to deliver
            </legend>
            {items.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-start gap-2 rounded border p-2 text-sm"
              >
                <input
                  type="radio"
                  value={a.id}
                  className="mt-1"
                  {...register("addressId", { onChange: copyPincode(items) })}
                />
                <span>
                  <b>{a.fullName}</b> ({a.type}
                  {a.isDefault ? ", default" : ""})<br />
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state}{" "}
                  {a.pincode}
                  <br />
                  Mobile: {a.phone}
                </span>
              </label>
            ))}
            {errors.addressId && (
              <p
                id="address-error"
                role="alert"
                className="text-xs text-red-700"
              >
                {errors.addressId.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => setAdding(true)}
            >
              Add a new address
            </Button>
          </fieldset>
        )}
      </AsyncView>
      <AddressFormDialog
        target={adding ? "new" : undefined}
        pending={false}
        onClose={() => setAdding(false)}
        onSubmit={(input) => saveNew(input)}
      />
    </div>
  )
}
