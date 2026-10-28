import { useInfiniteQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { EmptyState } from "@/components/common/EmptyState"
import { ErrorState } from "@/components/common/ErrorState"
import { ListSkeleton } from "@/components/common/Skeletons"
import { Button } from "@/components/ui/button"
import { toApiError } from "@/lib/api/errors"
import { formatDate, formatRupees } from "@/lib/format"
import { paths } from "@/lib/paths"

import { paymentQueries } from "../queries"
import type { Payment } from "../schemas"

const STATUS_TEXT: Record<Payment["status"], string> = {
  created: "Not paid yet",
  failed: "Failed",
  paid: "Paid",
  cancelled: "Cancelled",
}

/** `/account/payments` (11.4): payment history with method, status and refunds. */
export function PaymentsPage() {
  const q = useInfiniteQuery({
    ...paymentQueries.infinite(),
    select: (d) => ({
      items: d.pages.flatMap((p) => p.items),
      total: d.pages.at(-1)!.meta.total,
    }),
  })
  return (
    <div className="max-w-3xl">
      <h1 className="mb-3 text-xl font-medium">Payment history</h1>
      {q.isPending ? (
        <ListSkeleton rows={3} label="Loading payments" />
      ) : !q.data ? (
        <ErrorState
          error={toApiError(q.error)}
          onRetry={() => void q.refetch()}
        />
      ) : q.data.items.length === 0 ? (
        <EmptyState
          title="No online payments yet"
          description="Orders paid with cash on delivery do not appear here."
        />
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {q.data.items.map((p) => (
              <li key={p.id} className="rounded border p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <Link
                    className="font-medium underline"
                    to={paths.order(p.orderId)}
                  >
                    {p.orderNumber}
                  </Link>
                  <span>{formatRupees(p.amount)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {STATUS_TEXT[p.status]}
                  {p.method ? `, ${p.method}` : ""}
                  {p.paidAt ? `, paid ${formatDate(p.paidAt)}` : ""}
                  {p.attempts > 0
                    ? `, ${p.attempts} failed attempt${p.attempts > 1 ? "s" : ""}`
                    : ""}
                  {p.provider === "mock" ? " (mock gateway)" : ""}
                </p>
                {p.failureReason && p.status === "failed" && (
                  <p className="text-xs text-destructive">{p.failureReason}</p>
                )}
                {p.refunds.length > 0 && (
                  <ul className="mt-1 text-xs" aria-label="Refunds">
                    {p.refunds.map((r) => (
                      <li key={r.createdAt}>
                        Refund {formatRupees(r.amount)}:{" "}
                        {r.status === "processed"
                          ? `processed ${r.processedAt ? formatDate(r.processedAt) : ""}`
                          : r.status === "pending"
                            ? "in progress"
                            : "failed"}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col items-center gap-2">
            {q.hasNextPage ? (
              <Button
                variant="outline"
                disabled={q.isFetchingNextPage}
                onClick={() => void q.fetchNextPage()}
              >
                {q.isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            ) : (
              <p role="status" className="text-xs text-muted-foreground">
                {q.data.total} payment{q.data.total === 1 ? "" : "s"} in total.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
