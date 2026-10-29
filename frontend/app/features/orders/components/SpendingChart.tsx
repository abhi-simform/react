import { useQuery } from "@tanstack/react-query"

import { toApiError } from "@/lib/api/errors"
import { formatRupees } from "@/lib/format"

import { orderQueries } from "../queries"
import type { Spending } from "../spending.api"

/** Heights as a percentage of the tallest bar; an all-zero series stays flat (no NaN). */
export function scaleBars(values: number[]): number[] {
  const max = Math.max(0, ...values)
  return values.map((v) => (max === 0 ? 0 : Math.round((v / max) * 100)))
}

const monthLabel = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
})
const label = (month: string) =>
  monthLabel.format(new Date(`${month}-01T00:00:00Z`))

/**
 * "My spending" (A.6): monthly spend as plain bars. No chart library on the storefront (it would be
 * the heaviest dependency of the account page for six rectangles): the bars are divs with a
 * percentage height, the chart has a name and summary for screen readers, and the SAME numbers are in
 * a real table underneath (the text alternative every chart needs).
 */
export function SpendingChart({ months = 6 }: { months?: number }) {
  const q = useQuery(orderQueries.spending(months))
  return (
    <section aria-labelledby="overview-spending">
      <h2 id="overview-spending" className="mb-2 font-medium">
        My spending
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading...
        </p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {toApiError(q.error).message}{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Retry
          </button>
        </p>
      ) : q.data.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing spent in the last {months} months.
        </p>
      ) : (
        <Bars data={q.data} />
      )}
    </section>
  )
}

function Bars({ data }: { data: Spending }) {
  const heights = scaleBars(data.points.map((p) => p.spent))
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">
        {formatRupees(data.total)} across {data.orders}{" "}
        {data.orders === 1 ? "order" : "orders"} in the last {data.months}{" "}
        months.
      </p>
      <div
        role="img"
        aria-label={`Monthly spending: ${data.points
          .map((p) => `${label(p.month)} ${formatRupees(p.spent)}`)
          .join(", ")}`}
        className="flex h-32 items-end gap-2 rounded border p-2"
      >
        {data.points.map((p, i) => (
          <div
            key={p.month}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div
              className="w-full rounded-t bg-primary"
              style={{ height: `${heights[i]}%`, minHeight: p.spent ? 2 : 0 }}
              title={`${label(p.month)}: ${formatRupees(p.spent)}`}
            />
            <span className="text-xs text-muted-foreground">
              {label(p.month)}
            </span>
          </div>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <caption className="sr-only">Spending per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Orders</th>
              <th scope="col">Spent</th>
            </tr>
          </thead>
          <tbody>
            {data.points.map((p) => (
              <tr key={p.month}>
                <th scope="row" className="font-normal">
                  {label(p.month)}
                </th>
                <td>{p.orders}</td>
                <td>{formatRupees(p.spent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
