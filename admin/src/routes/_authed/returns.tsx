import { useMemo, useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { toast } from "sonner"
import { z } from "zod"

import { DataTable } from "@/components/data-table/DataTable"
import {
  pagingSearch,
  tableHandlers,
  toPagination,
} from "@/components/data-table/url-state"
import { NativeSelect } from "@/components/native-select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as ordersApi from "@/features/orders/api"
import { ReasonDialog } from "@/features/orders/OrderStatusBar"
import type { AdminOrder } from "@/features/orders/types"
import { requirePermission } from "@/lib/auth/guards"
import { formatDateTime } from "@/lib/format"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"

const searchSchema = z.object({
  ...pagingSearch,
  status: z
    .enum(["requested", "approved", "rejected", "refunded"])
    .default("requested")
    .catch("requested"),
})
type Search = z.infer<typeof searchSchema>

const listOptions = (s: Search) => {
  const p = { status: s.status, page: s.page, limit: s.pageSize }
  return queryOptions({
    queryKey: qk.orders.returns(p),
    queryFn: ({ signal }) => ordersApi.listReturns(p, signal),
    placeholderData: keepPreviousData,
  })
}

export const Route = createFileRoute("/_authed/returns")({
  staticData: { crumb: "Returns" },
  beforeLoad: ({ context }) =>
    requirePermission(context.user, "returns:manage"),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(listOptions(deps))
  },
  component: ReturnsPage,
})

type Pending =
  | { order: AdminOrder; kind: "approve" }
  | { order: AdminOrder; kind: "reject" }
  | { order: AdminOrder; kind: "refund" }

function ReturnsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data, error, isFetching, refetch } = useQuery(listOptions(search))
  const [pending, setPending] = useState<Pending | null>(null)

  const decide = useMutation({
    mutationFn: (v: { p: Pending; note?: string }) =>
      v.p.kind === "refund"
        ? ordersApi.refundReturn(v.p.order.id, v.note)
        : ordersApi.decideReturn(
            v.p.order.id,
            v.p.kind === "approve" ? "approve" : "reject",
            v.note
          ),
    onSuccess: (o, v) =>
      toast.success(
        `Return for ${o.orderNumber}: ${v.p.kind === "approve" ? "approved" : v.p.kind === "reject" ? "rejected" : "refund started"}`
      ),
    onError: (e) => toast.error(e.message),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.orders.all() })
      void queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
    },
  })

  const columns = useMemo<ColumnDef<AdminOrder>[]>(
    () => [
      {
        id: "order",
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
        id: "customer",
        header: "Customer",
        enableSorting: false,
        cell: ({ row }) => row.original.customer?.name ?? "(deleted)",
      },
      {
        id: "reason",
        header: "Reason",
        enableSorting: false,
        cell: ({ row }) => {
          const r = row.original.returnRequest
          return (
            <span>
              {r?.reason.replaceAll("_", " ").toLowerCase()}
              {r?.note ? <span className="block text-xs">{r.note}</span> : null}
            </span>
          )
        },
      },
      {
        id: "items",
        header: "Items",
        enableSorting: false,
        cell: ({ row }) =>
          (row.original.returnRequest?.items ?? [])
            .map((i) => `${i.qty} x ${i.title}`)
            .join(", "),
      },
      {
        id: "amount",
        header: "Refund due",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.returnRequest?.refundAmount != null
            ? formatRupees(row.original.returnRequest.refundAmount)
            : "-",
      },
      {
        id: "requested",
        header: "Requested",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.returnRequest
            ? formatDateTime(row.original.returnRequest.requestedAt)
            : "",
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.returnRequest?.status}</Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const o = row.original
          const st = o.returnRequest?.status
          // The same legal-moves rule as the order page: requested -> approve/reject, approved -> refund.
          return (
            <div className="flex gap-1">
              {st === "requested" ? (
                <>
                  <Button
                    size="xs"
                    onClick={() => setPending({ order: o, kind: "approve" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant="destructive"
                    onClick={() => setPending({ order: o, kind: "reject" })}
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {st === "approved" && o.status === "returned" ? (
                <Button
                  size="xs"
                  variant="destructive"
                  onClick={() => setPending({ order: o, kind: "refund" })}
                >
                  Refund
                </Button>
              ) : null}
            </div>
          )
        },
      },
    ],
    []
  )

  const handlers = tableHandlers(
    { ...search, sort: "x", order: "desc" as const },
    (p) => void navigate({ search: (prev) => ({ ...prev, ...pickPaging(p) }) })
  )
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Returns queue</h1>
      <DataTable
        caption="Return requests"
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r.id}
        meta={data?.meta}
        sorting={[]}
        pagination={toPagination(search)}
        onPaginationChange={handlers.onPaginationChange}
        onSortingChange={() => undefined}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        emptyMessage={`No ${search.status} returns.`}
        toolbar={
          <NativeSelect
            aria-label="Return status"
            value={search.status}
            onChange={(e) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  page: 1,
                  status: e.target.value as Search["status"],
                }),
              })
            }
          >
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="refunded">Refunded</option>
          </NativeSelect>
        }
      />

      {pending?.kind === "reject" ? (
        <ReasonDialog
          action={{
            to: "delivered",
            label: "Reject return...",
            kind: "cancel",
            destructive: true,
            description:
              "The order goes back to delivered and the customer sees your reason.",
          }}
          orderNumber={pending.order.orderNumber}
          onClose={() => setPending(null)}
          onSubmit={(note) => {
            decide.mutate({ p: pending, note })
            setPending(null)
          }}
        />
      ) : null}
      <AlertDialog
        open={pending?.kind === "approve" || pending?.kind === "refund"}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "approve"
                ? "Approve this return?"
                : "Refund this return?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Order {pending?.order.orderNumber}.{" "}
              {pending?.kind === "approve"
                ? "The returned items are restocked and the customer is told."
                : `${pending?.order.returnRequest?.refundAmount != null ? formatRupees(pending.order.returnRequest.refundAmount) : "The amount due"} goes back to the customer. Online payments are refunded through the gateway. This cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) decide.mutate({ p: pending })
                setPending(null)
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

const pickPaging = (p: { page?: number; pageSize?: number }) => ({
  ...(p.page !== undefined ? { page: p.page } : {}),
  ...(p.pageSize !== undefined ? { pageSize: p.pageSize } : {}),
})
