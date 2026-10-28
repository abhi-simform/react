import { useCallback, useEffect, useReducer, useRef } from "react"

import { toApiError, type ApiError } from "@/lib/api/errors"
import { isAbortError } from "@/lib/async"
import type { AsyncState } from "@/lib/asyncState"

import {
  createAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../addresses.api"
import type { Address, AddressInput } from "../schemas"

export type AddressOp = "create" | "update" | "remove" | "default"
/** Pending marker for the "Add address" action (no row exists yet). */
export const NEW_ROW = "new"

type State = {
  list: AsyncState<Address[]>
  /** Which row is busy with which operation (a row can only do one thing at a time). */
  pending: Record<string, AddressOp>
  /** Last failure of a row-level action (remove / set default), shown inline on that row. */
  rowErrors: Record<string, string>
}

type Action =
  | { type: "loading" }
  | { type: "loaded"; items: Address[] }
  | { type: "failed"; error: ApiError }
  | { type: "patch"; update: (items: Address[]) => Address[] }
  | { type: "start"; key: string; op: AddressOp }
  | { type: "finish"; key: string; error?: string }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, list: { status: "loading" } }
    case "loaded":
      return { ...state, list: { status: "success", data: action.items } }
    case "failed":
      return { ...state, list: { status: "error", error: action.error } }
    case "patch":
      // Patching only makes sense on loaded data.
      return state.list.status === "success"
        ? {
            ...state,
            list: { status: "success", data: action.update(state.list.data) },
          }
        : state
    case "start": {
      const { [action.key]: _old, ...rowErrors } = state.rowErrors
      return {
        ...state,
        pending: { ...state.pending, [action.key]: action.op },
        rowErrors,
      }
    }
    case "finish": {
      const { [action.key]: _done, ...pending } = state.pending
      return {
        ...state,
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
 * - create: REFETCH. The server decides ordering and whether the new row became the
 *   default (first address, or `isDefault`), and I would have to re-implement that.
 * - update: PATCH local state from the response (one row, nothing else changes).
 * - set default: PATCH (flip the flag on every row from the response id): instant, no list trip.
 * - remove: PATCH using `newDefaultId` from the response (the server auto-promotes one).
 * Trade-off: patching saves a request and keeps scroll/focus, but copies server rules into
 * the client (a rule change silently desyncs it); refetching is always right and costs a
 * round trip. Failures never touch the local list, so there is no rollback to get wrong.
 */
export function useAddresses() {
  const [state, dispatch] = useReducer(reducer, {
    list: { status: "loading" },
    pending: {},
    rowErrors: {},
  })
  const [reloadKey, bump] = useReducer((n: number) => n + 1, 0)
  // A ref, not state: two clicks in the same tick both see the OLD state, but they
  // see the same ref. This is what really prevents a double POST.
  const busy = useRef(new Set<string>())

  useEffect(() => {
    const controller = new AbortController()
    getAddresses(controller.signal)
      .then((items) => dispatch({ type: "loaded", items }))
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        dispatch({ type: "failed", error: toApiError(error) })
      })
    return () => controller.abort()
  }, [reloadKey])

  const reload = useCallback(() => {
    dispatch({ type: "loading" })
    bump()
  }, [])

  /** Runs one mutation for one row: guard, mark pending, always unmark. Returns the error or null. */
  const run = useCallback(
    async <T>(
      key: string,
      op: AddressOp,
      action: () => Promise<T>,
      onSuccess: (result: T) => void | Promise<void>,
      inlineError: boolean
    ): Promise<ApiError | null> => {
      if (busy.current.has(key)) return null // already running: ignore the repeat
      busy.current.add(key)
      dispatch({ type: "start", key, op })
      try {
        await onSuccess(await action())
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
    },
    []
  )

  const create = (input: AddressInput) =>
    run(
      NEW_ROW,
      "create",
      () => createAddress(input),
      async () => {
        // refetch silently: the old list stays visible instead of flashing a skeleton
        dispatch({ type: "loaded", items: await getAddresses() })
      },
      false
    )

  const update = (id: string, input: Partial<AddressInput>) =>
    run(
      id,
      "update",
      () => updateAddress(id, input),
      (saved) =>
        dispatch({
          type: "patch",
          update: (items) => items.map((a) => (a.id === saved.id ? saved : a)),
        }),
      false
    )

  const setDefault = (id: string) =>
    run(
      id,
      "default",
      () => setDefaultAddress(id),
      (saved) =>
        dispatch({
          type: "patch",
          update: (items) =>
            items.map((a) =>
              a.id === saved.id ? saved : { ...a, isDefault: false }
            ),
        }),
      true
    )

  const remove = (id: string) =>
    run(
      id,
      "remove",
      () => deleteAddress(id),
      ({ deletedId, newDefaultId }) =>
        dispatch({
          type: "patch",
          update: (items) =>
            items
              .filter((a) => a.id !== deletedId)
              .map((a) =>
                a.id === newDefaultId ? { ...a, isDefault: true } : a
              ),
        }),
      true
    )

  return {
    state: state.list,
    pending: state.pending,
    rowErrors: state.rowErrors,
    create,
    update,
    remove,
    setDefault,
    reload,
  }
}
