import { useMemo } from "react"
import { getRouteApi, Link } from "@tanstack/react-router"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table/DataTable"
import {
  tableHandlers,
  toPagination,
  toSorting,
} from "@/components/data-table/url-state"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"
import { listSellerOrders } from "./api"
import { StatusBadge } from "./StatusBadge"
import { STATUS_LABEL } from "./transitions"
import { ORDER_STATUSES, type SellerOrder } from "./types"

const route = getRouteApi("/_authed/orders/")

/**
 * Seller mode: the SAME route, a different endpoint. `/seller/orders` returns only the orders that
 * contain this seller's products, reduced to their own lines (no totals, no customer identity).
 * Read-only: status moves are the admin's.
 */
export function SellerOrdersPage() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const params = {
    status: search.status,
    search: search.search,
    page: search.page,
    limit: search.pageSize,
  }
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: qk.orders.list({ seller: true, ...params }),
    queryFn: ({ signal }) => listSellerOrders(params, signal),
    placeholderData: keepPreviousData,
  })
  const columns = useMemo<ColumnDef<SellerOrder>[]>(
    () => [
      {
        accessorKey: "orderNumber",
        header: "Order",
        enableSorting: false,
        cell: ({ row }) => (
          <Link
            to="/orders/$orderId"
            params={{ orderId: row.original.id }}
            className="font-medium hover:underline"
          >
            {row.original.orderNumber}
          </Link>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Placed",
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "items",
        header: "Your items",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.items.map((i) => `${i.qty} x ${i.title}`).join(", "),
      },
      {
        accessorKey: "yourTotal",
        header: "Your total",
        enableSorting: false,
        cell: ({ row }) => formatRupees(row.original.yourTotal),
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
  const handlers = tableHandlers(
    search,
    (p) => void navigate({ search: (prev) => ({ ...prev, ...p }) })
  )
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Orders containing your products</h1>
      <p className="text-sm text-muted-foreground">
        You see only your own lines. Status changes are made by the marketplace
        admin.
      </p>
      <DataTable
        caption="Your orders"
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        meta={data?.meta}
        sorting={toSorting({ sort: "createdAt", order: "desc" })}
        pagination={toPagination(search)}
        {...handlers}
        onSortingChange={() => undefined}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        toolbar={
          <NativeSelect
            aria-label="Status"
            value={search.status ?? ""}
            onChange={(e) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  page: 1,
                  status: (e.target.value || undefined) as typeof prev.status,
                }),
              })
            }
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.filter((s) => s !== "pending_payment").map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </NativeSelect>
        }
      />
    </section>
  )
}
