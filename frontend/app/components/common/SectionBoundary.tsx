import { QueryErrorResetBoundary } from "@tanstack/react-query"
import { useState, type ReactNode } from "react"
import { ErrorBoundary } from "react-error-boundary"

import { Button } from "@/components/ui/button"
import { reportError } from "@/lib/report"

type Props = {
  children: ReactNode
  /** What the fallback calls this part of the page: "Could not load reviews." */
  label: string
  /** When any of these change (a new product, a new filter) the boundary tries again by itself. */
  resetKeys?: readonly unknown[]
}

/**
 * A boundary for ONE independent part of a page (12.8): reviews, Q&A, a rail, the mega-menu, the
 * notification bell. A render error inside it shows a compact fallback and leaves everything
 * around it alive. What it does NOT catch: errors in event handlers, in async code (use
 * try/catch and Query's `onError`) and on the server; the global handlers in `lib/globalErrors`
 * report those.
 *
 * - `role="alert"` makes the failure announced; "Try again" is a real button, so it is focusable
 *   and keyboard operable.
 * - "Try again" first resets the failed QUERIES (`QueryErrorResetBoundary`): a Suspense/throwOnError
 *   query would otherwise re-throw its cached error at once.
 * - `resetKeys` re-arms the boundary on navigation without a click.
 * - The error is reported once, here, through `reportError`.
 */
export function SectionBoundary({ children, label, resetKeys }: Props) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          resetKeys={resetKeys ? [...resetKeys] : undefined}
          onReset={reset}
          onError={(error) => reportError(error, `boundary:${label}`)}
          fallbackRender={({ resetErrorBoundary }) => (
            <div
              role="alert"
              className="rounded border border-red-300 p-3 text-sm"
            >
              <p>Could not load {label}.</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={resetErrorBoundary}
              >
                Try again
              </Button>
            </div>
          )}
        >
          {children}
          {import.meta.env.DEV && <CrashSwitch label={label} />}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  )
}

/**
 * Dev only: "Crash this widget" throws DURING RENDER (an error thrown in the click handler would
 * not reach a boundary), so the fallback, the report and Try again can be exercised by hand.
 */
function CrashSwitch({ label }: { label: string }) {
  const [crashed, setCrashed] = useState(false)
  if (crashed) throw new Error(`Deliberate crash of "${label}" (dev switch)`)
  return (
    <button
      type="button"
      onClick={() => setCrashed(true)}
      className="mt-1 rounded border border-dashed border-red-400 px-1 text-xs text-red-700"
    >
      Crash this widget ({label})
    </button>
  )
}
