import { Button } from "@/components/ui/button"
import type { ApiError } from "@/lib/api/errors"

/** Reason + action for each class of failure. The raw `error.message` stays in logs, not here. */
export function describeError(error: ApiError): {
  title: string
  message: string
  retryable: boolean
} {
  if (error.isNetwork)
    return {
      title: "Cannot reach the server",
      message: "Check your internet connection, then try again.",
      retryable: true,
    }
  if (error.isTimeout)
    return {
      title: "This is taking too long",
      message: "The server did not answer in time. Try again.",
      retryable: true,
    }
  switch (error.status) {
    case 401:
      return {
        title: "Please sign in",
        message: "Your session has ended. Sign in again to continue.",
        retryable: false,
      }
    case 403:
      return {
        title: "Not allowed",
        message: "Your account cannot do this.",
        retryable: false,
      }
    case 404:
      return {
        title: "Not found",
        message: "What you are looking for does not exist any more.",
        retryable: false,
      }
    case 409:
      return {
        title: "That changed in the meantime",
        message: "Reload to see the latest state, then try again.",
        retryable: true,
      }
    case 422:
      return {
        title: "Some details are not valid",
        message: "Check what you entered and try again.",
        retryable: false,
      }
    case 429:
      return {
        title: "Too many requests",
        message: "Please wait a moment before trying again.",
        retryable: true,
      }
  }
  if (error.status >= 500)
    return {
      title: "Something went wrong on our side",
      message: "We could not load this. Try again in a moment.",
      retryable: true,
    }
  return {
    title: "Something went wrong",
    message: "Try again. If it keeps happening, contact support.",
    retryable: true,
  }
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry?: () => void
}) {
  const { title, message, retryable } = describeError(error)
  return (
    <div role="alert" className="rounded border border-red-300 p-4">
      <p className="font-medium text-red-800">{title}</p>
      <p className="text-sm">{message}</p>
      {/* The code is for support and bug reports. */}
      <p className="mt-1 text-xs text-neutral-500">Code: {error.code}</p>
      {onRetry && retryable && (
        <Button className="mt-2" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
