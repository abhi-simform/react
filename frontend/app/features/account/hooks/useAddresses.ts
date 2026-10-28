import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useState } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import { addressKeys } from "@/lib/queryKeys"
import { toAsyncState } from "@/lib/queryState"

import {
  createAddress,
  deleteAddress,
  setDefaultAddress,
  updateAddress,
} from "../addresses.api"
import { addressQueries } from "../queries"
import type { AddressInput } from "../schemas"

export type AddressOp = "create" | "update" | "remove" | "default"
/** Pending marker for the "Add address" action (no row exists yet). */
export const NEW_ROW = "new"

const mutationKey = (op: AddressOp) => [...addressKeys.all, op] as const

/**
 * Create (9.4): used by the address book AND the checkout address step. On success it
 * invalidates the whole `addressKeys.all` family and RETURNS that promise, so the mutation
 * stays `isPending` until the list has refetched (the button spinner never ends before the new
 * row appears). `silent`: the form maps 422/409 itself (via `mutateAsync` + try/catch), and the
 * caller's toast reports failures, so the global toast would be a duplicate for 5xx.
 */
export function useCreateAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: mutationKey("create"),
    mutationFn: (input: AddressInput) => createAddress(input),
    meta: { silent: true },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: addressKeys.all }),
  })
}

/**
 * Address CRUD as four mutations (9.4); the list is a query. Every success invalidates
 * `addressKeys.all` instead of patching the cache by hand: the server decides ordering, the
 * default flag and the auto-promotion on delete, so the client no longer re-implements those
 * rules (pain journal C.8). Trade-off: one extra GET per mutation.
 * Per-row pending state is derived from the mutations themselves (`useMutationState` reads
 * `variables`), not from a hand-made map; a repeated click on a busy row is ignored.
 */
export function useAddresses() {
  const queryClient = useQueryClient()
  const list = toAsyncState(useQuery(addressQueries.list()))
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: addressKeys.all })
  /** Last failure of a row-level action (remove / set default), shown inline on that row. */
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})

  const createMutation = useCreateAddress()
  const updateMutation = useMutation({
    mutationKey: mutationKey("update"),
    mutationFn: ({ id, input }: { id: string; input: Partial<AddressInput> }) =>
      updateAddress(id, input),
    meta: { silent: true },
    onSuccess: invalidate,
  })
  const defaultMutation = useMutation({
    mutationKey: mutationKey("default"),
    mutationFn: (id: string) => setDefaultAddress(id),
    onSuccess: invalidate,
  })
  const removeMutation = useMutation({
    mutationKey: mutationKey("remove"),
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: invalidate,
  })

  // Which row is busy with which operation: read from the in-flight mutations' variables.
  const busyRows = useMutationState({
    filters: {
      status: "pending",
      predicate: (m) => m.options.mutationKey?.[0] === addressKeys.all[0],
    },
    select: (m): [string, AddressOp] => {
      const op = m.options.mutationKey?.[1] as AddressOp
      const v = m.state.variables
      const id =
        op === "create"
          ? NEW_ROW
          : op === "update"
            ? (v as { id: string }).id
            : (v as string)
      return [id, op]
    },
  })
  const pending = Object.fromEntries(busyRows) as Record<string, AddressOp>

  /** Resolves with the error (the form maps field errors from it) or null. */
  async function settle(work: Promise<unknown>): Promise<ApiError | null> {
    try {
      await work
      return null
    } catch (err) {
      return toApiError(err)
    }
  }

  const create = (input: AddressInput) => {
    if (pending[NEW_ROW]) return Promise.resolve(null) // double submit: ignored
    return settle(createMutation.mutateAsync(input))
  }
  const update = (id: string, input: Partial<AddressInput>) => {
    if (pending[id]) return Promise.resolve(null)
    return settle(updateMutation.mutateAsync({ id, input }))
  }

  async function rowAction(id: string, work: () => Promise<unknown>) {
    if (pending[id]) return null
    setRowErrors(({ [id]: _old, ...rest }) => rest)
    const error = await settle(work())
    if (error) setRowErrors((e) => ({ ...e, [id]: error.message }))
    return error
  }
  const setDefault = (id: string) =>
    rowAction(id, () => defaultMutation.mutateAsync(id))
  const remove = (id: string) =>
    rowAction(id, () => removeMutation.mutateAsync(id))

  return {
    state: list,
    pending,
    rowErrors,
    create,
    update,
    remove,
    setDefault,
    reload: list.reload,
  }
}
