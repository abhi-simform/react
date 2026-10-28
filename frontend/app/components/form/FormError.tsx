import { Button } from "@/components/ui/button"

type Props = {
  /** `errors.root?.server` from React Hook Form. */
  error: { message?: string; type?: string | number } | undefined
  /** Offered only for failures a retry can fix (the request never got an answer). */
  onRetry?: () => void
  retrying?: boolean
}

/** Form-level (root) error: not about one field. `role="alert"` announces it when it appears. */
export function FormError({ error, onRetry, retrying }: Props) {
  if (!error?.message) return null
  const retryable = error.type === "network" || error.type === "timeout"
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded border border-red-300 p-2 text-sm text-red-800"
    >
      <p>{error.message}</p>
      {retryable && onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="self-start"
          disabled={retrying}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}
