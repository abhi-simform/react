import { useEffect } from "react"
import { Link, isRouteErrorResponse } from "react-router"

import { NotFoundError } from "@/lib/notFound"
import { paths } from "@/lib/paths"
import { reportError } from "@/lib/report"

import { NotFoundPage } from "./NotFoundPage"

/**
 * What every ErrorBoundary renders. Two kinds of problem:
 * - "not found" (an unmatched URL surfaces as a 404 route error response, a missing
 *   product/category is a thrown `NotFoundError`): branded 404 with a way forward.
 * - everything else: a generic apology + retry. Users never see messages or stacks
 *   in production builds; in dev the message and stack help the developer.
 */
export function RouteErrorView({ error }: { error: unknown }) {
  const isNotFound =
    error instanceof NotFoundError ||
    (isRouteErrorResponse(error) && error.status === 404)

  useEffect(() => {
    if (!isNotFound) reportError(error, "route error boundary")
  }, [error, isNotFound])

  if (error instanceof NotFoundError)
    return (
      <NotFoundPage
        title={`${error.what} not found`}
        message={`${error.message}. It may have been removed, or the link is mistyped.`}
      />
    )
  if (isNotFound) return <NotFoundPage />

  const status = isRouteErrorResponse(error) ? error.status : 500
  const detail = import.meta.env.DEV
    ? error instanceof Error
      ? error.message
      : isRouteErrorResponse(error)
        ? error.statusText
        : String(error)
    : undefined
  const stack =
    import.meta.env.DEV && error instanceof Error ? error.stack : undefined

  return (
    <div role="alert" className="mx-auto max-w-xl p-4">
      <h1 className="text-xl font-medium">
        {status === 403 ? "403: Not allowed" : "Something went wrong"}
      </h1>
      <p className="my-2 text-sm">
        We hit an unexpected problem. Trying again usually helps.
      </p>
      {detail && <p className="text-sm text-red-800">Dev detail: {detail}</p>}
      {stack && (
        <pre className="my-2 overflow-x-auto rounded bg-neutral-100 p-2 text-xs">
          <code>{stack}</code>
        </pre>
      )}
      <div className="mt-3 flex gap-4 text-sm">
        <button
          type="button"
          className="rounded border px-3 py-1"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
        <Link to={paths.home()} className="underline">
          Back to the home page
        </Link>
      </div>
    </div>
  )
}
