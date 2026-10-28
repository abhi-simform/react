import type { ApiError } from "@/lib/api/errors"
import { assertNever } from "@/lib/assert"

/**
 * One state at a time. `data` exists only in "success", `error` only in
 * "error", so `isLoading && isError` or "success without data" cannot be built.
 */
export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: ApiError }

export function renderState<T>(
  state: AsyncState<T>,
  renderData: (data: T) => string
): string {
  switch (state.status) {
    case "idle":
      return "Nothing requested yet"
    case "loading":
      return "Loading..."
    case "success":
      return renderData(state.data)
    case "error":
      return `Error ${state.error.code}: ${state.error.message}`
    default:
      return assertNever(state)
  }
}
