import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

type Props = {
  title: string
  /** One sentence for screen readers: what the chart says (the numbers are in the table below it). */
  summary: string
  isPending: boolean
  isFetching?: boolean
  error: Error | null
  onRetry: () => void
  isEmpty: boolean
  emptyMessage?: string
  chart: ReactNode
  /** The text alternative: every chart ships its data as a real table. */
  table: ReactNode
}

/**
 * Chart frame with all four states (loading, error + retry, empty, data), an accessible name and a
 * "View as table" disclosure. While a new range loads, the previous chart stays (dimmed): `isPending`
 * is only true for the very first load.
 */
export function ChartCard({
  title,
  summary,
  isPending,
  isFetching,
  error,
  onRetry,
  isEmpty,
  emptyMessage = "No data for this range.",
  chart,
  table,
}: Props) {
  return (
    <figure
      className="flex flex-col gap-2 rounded border p-4"
      aria-busy={isFetching}
    >
      <figcaption className="font-medium">{title}</figcaption>
      {error && isPending ? (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p>{error.message}</p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : isPending ? (
        <Skeleton className="h-[260px] w-full" />
      ) : isEmpty ? (
        <p className="py-10 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <>
          <div
            role="img"
            aria-label={`${title}. ${summary}`}
            className={isFetching ? "opacity-60 transition-opacity" : undefined}
          >
            {chart}
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              View as table
            </summary>
            <div className="mt-2 max-h-64 overflow-auto text-sm">{table}</div>
          </details>
        </>
      )}
    </figure>
  )
}
