import { lazy, Suspense } from "react"
import { getRouteApi, Link } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"

import { NativeSelect } from "@/components/native-select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { can } from "@/lib/auth/can"
import { formatRupees } from "@/lib/money"
import type { RangeParams } from "./api"
import { ChartCard } from "./ChartCard"
import { formatDay, formatDelta } from "./format"
import {
  categoryShareOptions,
  funnelOptions,
  lowStockOptions,
  overviewOptions,
  revenueOptions,
  statusOptions,
  topProductsOptions,
} from "./queries"
import { STATUS_LABEL } from "@/features/orders/transitions"
import type { OrderStatus } from "@/features/orders/types"

// Recharts is the heaviest dependency of the console: load it only when the dashboard opens (route-level
// splitting does not help here because the dashboard IS the landing page, so split the library out of
// the main chunk instead: the shell and tables paint first).
const charts = import("./charts")
const RevenueChart = lazy(() =>
  charts.then((m) => ({ default: m.RevenueChart }))
)
const StatusDonut = lazy(() => charts.then((m) => ({ default: m.StatusDonut })))
const TopProductsChart = lazy(() =>
  charts.then((m) => ({ default: m.TopProductsChart }))
)
const CategoryShareChart = lazy(() =>
  charts.then((m) => ({ default: m.CategoryShareChart }))
)
const FunnelChart = lazy(() => charts.then((m) => ({ default: m.FunnelChart })))

const route = getRouteApi("/_authed/")
const fallback = <Skeleton className="h-[260px] w-full" />

export const PRESETS = [7, 30, 90] as const

/** URL search -> the API's range params. Custom (from/to) wins over a preset. */
export const toRange = (s: {
  days: number
  from?: string
  to?: string
}): RangeParams => (s.from ? { from: s.from, to: s.to } : { days: s.days })

export function Dashboard() {
  const { user } = route.useRouteContext()
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const range = toRange(search)
  const isAdmin = can(user, "orders:update") // admin-only extras: funnel, new customers
  const custom = !!search.from

  const overview = useQuery(overviewOptions(range))
  const revenue = useQuery(revenueOptions(range))
  const statuses = useQuery(statusOptions(range))
  const top = useQuery(topProductsOptions(range))
  const share = useQuery(categoryShareOptions(range))
  const low = useQuery(lowStockOptions())
  const funnel = useQuery({ ...funnelOptions(range), enabled: isAdmin })

  const setRange = (p: { days?: number; from?: string; to?: string }) =>
    void navigate({
      search: (prev) => ({
        ...prev,
        days: prev.days,
        from: undefined,
        to: undefined,
        ...p,
      }),
    })

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-medium">
          {isAdmin ? "Dashboard" : "Your dashboard"}
        </h1>
        <div
          className="flex flex-wrap items-center gap-2 text-sm"
          role="group"
          aria-label="Date range"
        >
          <label className="flex items-center gap-1">
            Range
            <NativeSelect
              value={custom ? "custom" : String(search.days)}
              onChange={(e) =>
                e.target.value === "custom"
                  ? setRange({
                      from: search.from ?? defaultFrom(search.days),
                      to: search.to,
                    })
                  : setRange({ days: Number(e.target.value) })
              }
            >
              {PRESETS.map((d) => (
                <option key={d} value={d}>
                  Last {d} days
                </option>
              ))}
              <option value="custom">Custom...</option>
            </NativeSelect>
          </label>
          {custom ? (
            <>
              <label className="flex items-center gap-1">
                From
                <Input
                  type="date"
                  className="w-36"
                  value={search.from ?? ""}
                  max={search.to}
                  onChange={(e) =>
                    e.target.value &&
                    setRange({ from: e.target.value, to: search.to })
                  }
                />
              </label>
              <label className="flex items-center gap-1">
                To
                <Input
                  type="date"
                  className="w-36"
                  value={search.to ?? ""}
                  min={search.from}
                  onChange={(e) =>
                    setRange({
                      from: search.from,
                      to: e.target.value || undefined,
                    })
                  }
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      {/* KPI cards */}
      <section
        aria-label="Key numbers"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
      >
        {overview.error && !overview.data ? (
          <div role="alert" className="col-span-full text-sm">
            {overview.error.message}{" "}
            <button
              className="underline"
              onClick={() => void overview.refetch()}
            >
              Retry
            </button>
          </div>
        ) : null}
        {overview.data
          ? [
              {
                label: "Revenue",
                kpi: overview.data.revenue,
                fmt: formatRupees,
              },
              { label: "Orders", kpi: overview.data.orders, fmt: String },
              {
                label: "Average order",
                kpi: overview.data.averageOrderValue,
                fmt: formatRupees,
              },
              {
                label: "Units sold",
                kpi: overview.data.unitsSold,
                fmt: String,
              },
              ...(overview.data.newCustomers
                ? [
                    {
                      label: "New customers",
                      kpi: overview.data.newCustomers,
                      fmt: String,
                    },
                  ]
                : []),
            ].map(({ label, kpi, fmt }) => (
              <article
                key={label}
                className="rounded border p-3"
                aria-busy={overview.isFetching}
              >
                <h2 className="text-sm text-muted-foreground">{label}</h2>
                <p className="text-2xl font-semibold">{fmt(kpi.value)}</p>
                <p className="text-xs">
                  <span
                    className={
                      kpi.deltaPct !== null && kpi.deltaPct < 0
                        ? "text-destructive"
                        : "text-emerald-700 dark:text-emerald-400"
                    }
                  >
                    {formatDelta(kpi.deltaPct)}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    vs previous {overview.data.range.days} days (
                    {fmt(kpi.previous)})
                  </span>
                </p>
              </article>
            ))
          : overview.isPending
            ? Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-24" />
              ))
            : null}
      </section>

      {overview.data ? (
        <ul
          aria-label="Needs attention"
          className="flex flex-wrap gap-4 text-sm"
        >
          <li>
            <Link
              to="/orders"
              search={{ status: "placed" } as never}
              className="underline"
            >
              {overview.data.attention.toShip} orders to pack
            </Link>
          </li>
          {isAdmin ? (
            <li>
              <Link to="/returns" className="underline">
                {overview.data.attention.returnsOpen} open returns
              </Link>
            </li>
          ) : null}
          <li>
            <Link
              to="/products"
              search={{ lowStock: true } as never}
              className="underline"
            >
              {overview.data.attention.lowStock} products at or below{" "}
              {overview.data.attention.lowStockThreshold} in stock
            </Link>
          </li>
        </ul>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="xl:col-span-2">
          <ChartCard
            title="Revenue by day"
            summary={
              revenue.data
                ? `${formatRupees(revenue.data.total)} over ${revenue.data.points.length} days.`
                : ""
            }
            isPending={revenue.isPending}
            isFetching={revenue.isFetching}
            error={revenue.error}
            onRetry={() => void revenue.refetch()}
            isEmpty={!revenue.data || revenue.data.total === 0}
            chart={
              <Suspense fallback={fallback}>
                <RevenueChart points={revenue.data?.points ?? []} />
              </Suspense>
            }
            table={
              <SimpleTable
                caption="Revenue by day"
                head={["Day", "Orders", "Revenue"]}
                rows={(revenue.data?.points ?? []).map((p) => [
                  formatDay(p.date),
                  String(p.orders),
                  formatRupees(p.revenue),
                ])}
              />
            }
          />
        </div>

        <ChartCard
          title="Orders by status"
          summary={(statuses.data ?? [])
            .map((s) => `${s.count} ${s.status.replaceAll("_", " ")}`)
            .join(", ")}
          isPending={statuses.isPending}
          isFetching={statuses.isFetching}
          error={statuses.error}
          onRetry={() => void statuses.refetch()}
          isEmpty={!statuses.data?.length}
          chart={
            <Suspense fallback={fallback}>
              <StatusDonut data={statuses.data ?? []} />
            </Suspense>
          }
          table={
            <SimpleTable
              caption="Orders by status"
              head={["Status", "Orders", "Value"]}
              rows={(statuses.data ?? []).map((s) => [
                s.status in STATUS_LABEL
                  ? STATUS_LABEL[s.status as OrderStatus]
                  : s.status,
                String(s.count),
                formatRupees(s.amount),
              ])}
            />
          }
        />

        <ChartCard
          title="Top products by revenue"
          summary={(top.data ?? [])
            .map((p) => `${p.name} ${formatRupees(p.revenue)}`)
            .join("; ")}
          isPending={top.isPending}
          isFetching={top.isFetching}
          error={top.error}
          onRetry={() => void top.refetch()}
          isEmpty={!top.data?.length}
          chart={
            <Suspense fallback={fallback}>
              <TopProductsChart data={top.data ?? []} />
            </Suspense>
          }
          table={
            <SimpleTable
              caption="Top products"
              head={["Product", "Units", "Revenue", "Stock"]}
              rows={(top.data ?? []).map((p) => [
                p.name,
                String(p.units),
                formatRupees(p.revenue),
                String(p.stock),
              ])}
            />
          }
        />

        <ChartCard
          title="Revenue share by category"
          summary={(share.data ?? [])
            .map((c) => `${c.name} ${c.sharePct}%`)
            .join(", ")}
          isPending={share.isPending}
          isFetching={share.isFetching}
          error={share.error}
          onRetry={() => void share.refetch()}
          isEmpty={!share.data?.length}
          chart={
            <Suspense fallback={fallback}>
              <CategoryShareChart data={share.data ?? []} />
            </Suspense>
          }
          table={
            <SimpleTable
              caption="Category share"
              head={["Category", "Share", "Revenue"]}
              rows={(share.data ?? []).map((c) => [
                c.name,
                `${c.sharePct}%`,
                formatRupees(c.revenue),
              ])}
            />
          }
        />

        {isAdmin ? (
          <ChartCard
            title="Conversion funnel (signed-in shoppers)"
            summary={(funnel.data?.steps ?? [])
              .map((s) => `${s.label} ${s.count}`)
              .join(", ")}
            isPending={funnel.isPending}
            isFetching={funnel.isFetching}
            error={funnel.error}
            onRetry={() => void funnel.refetch()}
            isEmpty={
              !funnel.data || funnel.data.steps.every((s) => s.count === 0)
            }
            chart={
              <Suspense fallback={fallback}>
                <FunnelChart steps={funnel.data?.steps ?? []} />
              </Suspense>
            }
            table={
              <SimpleTable
                caption="Conversion funnel"
                head={["Step", "Shoppers", "Of previous", "Of first"]}
                rows={(funnel.data?.steps ?? []).map((s) => [
                  s.label,
                  String(s.count),
                  s.ofPrevious === null ? "-" : `${s.ofPrevious}%`,
                  s.ofFirst === null ? "-" : `${s.ofFirst}%`,
                ])}
              />
            }
          />
        ) : null}

        <section className="rounded border p-4" aria-labelledby="low-stock">
          <h2 id="low-stock" className="mb-2 font-medium">
            Low stock
            {low.data
              ? ` (${low.data.total} at or below ${low.data.threshold})`
              : ""}
          </h2>
          {low.error && !low.data ? (
            <p role="alert" className="text-sm">
              {low.error.message}
            </p>
          ) : low.isPending ? (
            <Skeleton className="h-32 w-full" />
          ) : low.data.items.length === 0 ? (
            <p className="text-muted-foreground">Nothing is running low.</p>
          ) : (
            <SimpleTable
              caption="Low stock products"
              head={["Product", "SKU", "In stock", "Sold"]}
              rows={low.data.items.map((p) => [
                p.name,
                p.sku,
                String(p.stock),
                String(p.soldCount),
              ])}
            />
          )}
        </section>
      </div>
    </section>
  )
}

function defaultFrom(days: number) {
  const d = new Date(Date.now() + 330 * 60_000 - (days - 1) * 86_400_000)
  return d.toISOString().slice(0, 10)
}

function SimpleTable({
  caption,
  head,
  rows,
}: {
  caption: string
  head: string[]
  rows: string[][]
}) {
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          {head.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={i}>
            {r.map((c, j) => (
              <TableCell key={j}>{c}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
