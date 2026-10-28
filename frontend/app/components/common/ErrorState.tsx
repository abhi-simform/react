import { Button } from "@/components/ui/button"
import type { ApiError } from "@/lib/api/errors"

export function ErrorState({
  error,
  onRetry,
}: {
  error: ApiError
  onRetry?: () => void
}) {
  // Users see the message; the code is for logs and support (see the hook).
  return (
    <div role="alert" className="rounded border border-red-300 p-4">
      <p className="font-medium text-red-800">Something went wrong</p>
      <p className="text-sm">{error.message}</p>
      {onRetry && (
        <Button className="mt-2" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}
