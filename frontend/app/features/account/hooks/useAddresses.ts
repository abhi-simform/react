import { useReducer, useRef } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import { useFetch } from "@/hooks/useFetch"

import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../addresses.api"
import type { AddressInput } from "../schemas"

export type AddressOp = "create" | "update" | "remove" | "default"
/** Pending marker for the "Add address" action (no row exists yet). */
export const NEW_ROW = "new"

/** Mutation bookkeeping only. The list itself is `useFetch` (6.8); before it was a reducer written by hand (6.3). */
type State = {
  /** Which row is busy with which operation (a row can only do one thing at a time). */
  pending: Record<string, AddressOp>
  /** Last failure of a row-level action (remove / set default), shown inline on that row. */
  rowErrors: Record<string, string>
}

type Action =
  | { type: "start"; key: string; op: AddressOp }
  | { type: "finish"; key: string; error?: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start": {
      const { [action.key]: _old, ...rowErrors } = state.rowErrors
      return {
        pending: { ...state.pending, [action.key]: action.op },
        rowErrors,
      }
    }
    case "finish": {
      const { [action.key]: _done, ...pending } = state.pending
      return {
        pending,
        rowErrors: action.error
          ? { ...state.rowErrors, [action.key]: action.error }
          : state.rowErrors,
      }
    }
  }
}

/**
 * Hand-rolled CRUD (6.3). Data flow decisions, per operation:
 * - create: REFETCH (`reload` keeps the old list visible while it runs). The server decides
 *   ordering and whether the new row became the default (first address, or `isDefault`).
 * - update: PATCH local state from the response (one row, nothing else changes).
 * - set default: PATCH (flip the flag on every row from the response id).
 * - remove: PATCH using `newDefaultId` from the response (the server auto-promotes one).
 * Trade-off: patching saves a request and keeps scroll/focus, but copies server rules into
 * the client (a rule change silently desyncs it); refetching is always right and costs a
 * round trip. Failures never touch the local list, so there is no rollback to get wrong.
 */
export function useAddresses() {
  const list = useFetch((signal) => getAddresses(signal), [])
  const [state, dispatch] = useReducer(reducer, { pending: {}, rowErrors: {} })
  // A ref, not state: two clicks in the same tick both see the OLD state, but they
  // see the same ref. This is what really prevents a double POST.
  const busy = useRef(new Set<string>())

  /** Runs one mutation for one row: guard, mark pending, always unmark. Returns the error or null. */
  async function run<T>(
    key: string,
    op: AddressOp,
    action: () => Promise<T>,
    onSuccess: (result: T) => void,
    inlineError: boolean
  ): Promise<ApiError | null> {
    if (busy.current.has(key)) return null // already running: ignore the repeat
    busy.current.add(key)
    dispatch({ type: "start", key, op })
    try {
      onSuccess(await action())
      dispatch({ type: "finish", key })
      return null
    } catch (err) {
      const error = toApiError(err)
      dispatch({
        type: "finish",
        key,
        error: inlineError ? error.message : undefined,
      })
      return error
    } finally {
      busy.current.delete(key)
    }
  }

  const create = (input: AddressInput) =>
    run(
      NEW_ROW,
      "create",
      () => createAddress(input),
      () => list.reload(),
      false
    )

  const update = (id: string, input: Partial<AddressInput>) =>
    run(
      id,
      "update",
      () => updateAddress(id, input),
      (saved) =>
        list.setData((items) =>
          items.map((a) => (a.id === saved.id ? saved : a))
        ),
      false
    )

  const setDefault = (id: string) =>
    run(
      id,
      "default",
      () => setDefaultAddress(id),
      (saved) =>
        list.setData((items) =>
          items.map((a) =>
            a.id === saved.id ? saved : { ...a, isDefault: false }
          )
        ),
      true
    )

  const remove = (id: string) =>
    run(
      id,
      "remove",
      () => deleteAddress(id),
      ({ deletedId, newDefaultId }) =>
        list.setData((items) =>
          items
            .filter((a) => a.id !== deletedId)
            .map((a) => (a.id === newDefaultId ? { ...a, isDefault: true } : a))
        ),
      true
    )

  return {
    state: list,
    pending: state.pending,
    rowErrors: state.rowErrors,
    create,
    update,
    remove,
    setDefault,
    reload: list.reload,
  }
}
