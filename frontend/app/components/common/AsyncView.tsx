import { ErrorState } from "@/components/common/ErrorState"
import type { ApiError } from "@/lib/api/errors"
import { assertNever } from "@/lib/assert"
import type { AsyncState } from "@/lib/asyncState"

type AsyncViewProps<T> = {
  state: AsyncState<T> & {
    reload?: () => void
    /** True while a reload is running and the previous data is still shown. */
    isRefreshing?: boolean
  }
  /** Skeleton with the same layout as the content. */
  loading: React.ReactNode
  /** Return a node when the successful data means "nothing to show"; return a falsy value otherwise. */
  empty?: (data: T) => React.ReactNode
  /** Replace the default `ErrorState` (e.g. to throw a 404 to the router). */
  error?: (error: ApiError, retry: (() => void) | undefined) => React.ReactNode
  children: (data: T) => React.ReactNode
}

/**
 * The five states of an async view in one place (6.5):
 * initial loading -> `loading`; refreshing (stale data stays, `aria-busy`); success -> `children`;
 * empty (success, zero results) -> `empty`; error -> `ErrorState` with retry.
 * "Partial" (some sections fail) is solved one level up: each section has its own AsyncView.
 */
export function AsyncView<T>({
  state,
  loading,
  empty,
  error,
  children,
}: AsyncViewProps<T>) {
  switch (state.status) {
    case "idle":
    case "loading":
      return loading
    case "error":
      return error ? (
        error(state.error, state.reload)
      ) : (
        <ErrorState error={state.error} onRetry={state.reload} />
      )
    case "success": {
      const emptyView = empty?.(state.data)
      if (emptyView) return emptyView
      return (
        <div aria-busy={state.isRefreshing || undefined}>
          {state.isRefreshing && (
            <p role="status" className="mb-1 text-xs text-neutral-500">
              Updating...
            </p>
          )}
          {children(state.data)}
        </div>
      )
    }
    default:
      return assertNever(state)
  }
}
