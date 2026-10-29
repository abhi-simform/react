import { useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable } from "@/components/data-table/DataTable"
import {
  pagingSearch,
  tableHandlers,
  toPagination,
  toSorting,
} from "@/components/data-table/url-state"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import * as ordersApi from "@/features/orders/api"
import {
  markOrdersSeen,
  useUnseenOrders,
} from "@/features/orders/useLiveOrders"
import { orderListOptions } from "@/features/orders/queries"
import { SellerOrdersPage } from "@/features/orders/SellerOrders"
import { StatusBadge } from "@/features/orders/StatusBadge"
import { STATUS_LABEL } from "@/features/orders/transitions"
import { ORDER_STATUSES, type AdminOrder } from "@/features/orders/types"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { downloadText } from "@/lib/download"
import { formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"

const date = z.iso.date().optional().catch(undefined)
export const ordersSearchSchema = z.object({
  ...pagingSearch,
  sort: z.enum(["createdAt", "total"]).default("createdAt").catch("createdAt"),
  search: z.string().trim().max(40).optional().catch(undefined),
  status: z.enum(ORDER_STATUSES).optional().catch(undefined),
  paymentMethod: z.enum(["cod", "razorpay"]).optional().catch(undefined),
  from: date,
  to: date,
})
type Search = z.infer<typeof ordersSearchSchema>

const toParams = (s: Search): ordersApi.OrderListParams => ({
  search: s.search,
  status: s.status,
  paymentMethod: s.paymentMethod,
  from: s.from,
  to: s.to,
  sort: s.sort,
  order: s.order,
  page: s.page,
  limit: s.pageSize,
})

export const Route = createFileRoute("/_authed/orders/")({
  validateSearch: ordersSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Sellers read a different endpoint (their own lines): the page fetches it itself.
    if (context.user.role === "admin")
      void context.queryClient.prefetchQuery(orderListOptions(toParams(deps)))
  },
  component: OrdersPage,
})

function OrdersPage() {
  const { user } = Route.useRouteContext()
  return user.role === "admin" ? <AdminOrdersPage /> : <SellerOrdersPage />
}

function AdminOrdersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const params = toParams(search)
  const { data, error, isFetching, refetch } = useQuery(
    orderListOptions(params)
  )
  const unseen = useUnseenOrders()
  useEffect(() => {
    // Looking at page 1 of the default view counts as "seen" the new orders.
    if (search.page === 1) markOrdersSeen()
  }, [search.page, data])

  const patch = (p: Partial<Search>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace })
  const setFilter = (p: Partial<Search>, replace = false) =>
    patch({ ...p, page: 1 }, replace)

  const [text, setText] = useState(search.search ?? "")
  const pushed = useRef(search.search ?? "")
  const debounced = useDebouncedValue(text.trim(), 300)
  useEffect(() => {
    if (debounced !== pushed.current) {
      pushed.current = debounced
      void setFilter({ search: debounced || undefined }, true)
    }
  }, [debounced])
  useEffect(() => {
    if ((search.search ?? "") !== pushed.current) {
      pushed.current = search.search ?? ""
      setText(search.search ?? "")
    }
  }, [search.search])

  const columns = useMemo<ColumnDef<AdminOrder>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to="/orders/$orderId"
            params={{ orderId: row.original.id }}
            className="font-medium underline-offset-2 hover:underline"
          >
            {row.original.orderNumber}
          </Link>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "customer",
        header: "Customer",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.customer?.name ?? "(deleted)"}
            <span className="block text-xs text-muted-foreground">
              {row.original.customer?.email}
            </span>
          </span>
        ),
      },
      {
        id: "items",
        header: "Items",
        enableSorting: false,
        cell: ({ row }) => row.original.items.reduce((n, i) => n + i.qty, 0),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatRupees(row.original.pricing.total),
      },
      {
        id: "payment",
        header: "Payment",
        enableSorting: false,
        cell: ({ row }) =>
          `${row.original.paymentMethod.toUpperCase()} / ${row.original.paymentStatus.replaceAll("_", " ")}`,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="xs"
            variant="outline"
            nativeButton={false}
            render={
              <Link
                to="/orders/$orderId"
                params={{ orderId: row.original.id }}
              />
            }
          >
            Open
          </Button>
        ),
      },
    ],
    []
  )

  const handlers = tableHandlers(search, (p) => void patch(p))
  const exportCsv = async () => {
    try {
      const { page: _p, limit: _l, ...filters } = params
      downloadText("orders.csv", await ordersApi.exportOrdersCsv(filters))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed")
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Orders</h1>
        {unseen > 0 ? (
          <Button
            variant="outline"
            size="sm"
            role="status"
            onClick={() => {
              markOrdersSeen()
              void patch({ page: 1, sort: "createdAt", order: "desc" })
              void refetch()
            }}
          >
            {unseen} new {unseen === 1 ? "order" : "orders"}: show
          </Button>
        ) : null}
      </div>
      <DataTable
        caption="Orders"
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        meta={data?.meta}
        sorting={toSorting(search)}
        pagination={toPagination(search)}
        {...handlers}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        toolbar={
          <>
            <Input
              type="search"
              aria-label="Search orders"
              placeholder="Order no., customer name or email"
              className="w-64"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <NativeSelect
              aria-label="Status"
              value={search.status ?? ""}
              onChange={(e) =>
                setFilter({
                  status: (e.target.value || undefined) as Search["status"],
                })
              }
            >
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Payment method"
              value={search.paymentMethod ?? ""}
              onChange={(e) =>
                setFilter({
                  paymentMethod: (e.target.value ||
                    undefined) as Search["paymentMethod"],
                })
              }
            >
              <option value="">Any payment</option>
              <option value="cod">COD</option>
              <option value="razorpay">Online</option>
            </NativeSelect>
            <label className="flex items-center gap-1 text-sm">
              From
              <Input
                type="date"
                className="w-36"
                value={search.from ?? ""}
                max={search.to}
                onChange={(e) =>
                  setFilter({ from: e.target.value || undefined })
                }
              />
            </label>
            <label className="flex items-center gap-1 text-sm">
              To
              <Input
                type="date"
                className="w-36"
                value={search.to ?? ""}
                min={search.from}
                onChange={(e) => setFilter({ to: e.target.value || undefined })}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void exportCsv()}
            >
              Export CSV
            </Button>
          </>
        }
      />
    </section>
  )
}
