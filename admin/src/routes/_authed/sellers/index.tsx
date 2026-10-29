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
import { ReasonDialog } from "@/features/orders/OrderStatusBar"
import * as api from "@/features/sellers/api"
import { formatDateTime } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

const searchSchema = z.object({
  ...pagingSearch,
  status: z
    .enum(["pending", "approved", "rejected"])
    .default("pending")
    .catch("pending"),
})
type Search = z.infer<typeof searchSchema>

const listOptions = (s: Search) => {
  const p = { status: s.status, page: s.page, limit: s.pageSize }
  return queryOptions({
    queryKey: qk.sellers.applications(p),
    queryFn: ({ signal }) => api.listApplications(p, signal),
    placeholderData: keepPreviousData,
  })
}

export const Route = createFileRoute("/_authed/sellers/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(listOptions(deps))
  },
  component: SellersPage,
})

type Pending = { app: api.Application; kind: "approve" | "reject" }

function SellersPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data, error, isFetching, refetch } = useQuery(listOptions(search))
  const [pending, setPending] = useState<Pending | null>(null)

  const decide = useMutation({
    mutationFn: (v: { p: Pending; note?: string }) =>
      api.decideApplication(v.p.app.id, v.p.kind, v.note),
    onSuccess: (a) =>
      toast.success(`${a.businessName}: application ${a.status}`),
    // 409 ALREADY_REVIEWED when another admin got there first: shown as is, the list refreshes below.
    onError: (e) => toast.error(e.message),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: qk.sellers.all() })
      void queryClient.invalidateQueries({ queryKey: qk.users.all() })
    },
  })

  const columns = useMemo<ColumnDef<api.Application>[]>(
    () => [
      {
        id: "business",
        header: "Business",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            <strong>{row.original.businessName}</strong>
            <span className="block text-xs text-muted-foreground">
              {row.original.about}
            </span>
          </span>
        ),
      },
      {
        id: "applicant",
        header: "Applicant",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.user.name}
            <span className="block text-xs text-muted-foreground">
              {row.original.user.email}
            </span>
          </span>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.phone}
            <span className="block text-xs">
              {row.original.gstin ?? "no GSTIN"}
            </span>
          </span>
        ),
      },
      {
        id: "applied",
        header: "Applied",
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            <Badge
              variant={
                row.original.status === "pending" ? "outline" : "secondary"
              }
            >
              {row.original.status}
            </Badge>
            {row.original.reviewNote ? (
              <span className="block text-xs">{row.original.reviewNote}</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "pending" ? (
            <div className="flex gap-1">
              <Button
                size="xs"
                onClick={() =>
                  setPending({ app: row.original, kind: "approve" })
                }
              >
                Approve
              </Button>
              <Button
                size="xs"
                variant="destructive"
                onClick={() =>
                  setPending({ app: row.original, kind: "reject" })
                }
              >
                Reject
              </Button>
            </div>
          ) : row.original.status === "approved" ? (
            <Button
              size="xs"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/sellers/$sellerId"
                  params={{ sellerId: row.original.user.id }}
                />
              }
            >
              Seller detail
            </Button>
          ) : null,
      },
    ],
    []
  )
  const handlers = tableHandlers(
    { ...search, sort: "x", order: "desc" as const },
    (p) =>
      void navigate({
        search: (prev) => ({
          ...prev,
          ...(p.page !== undefined ? { page: p.page } : {}),
          ...(p.pageSize !== undefined ? { pageSize: p.pageSize } : {}),
        }),
      })
  )
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Seller applications</h1>
      <DataTable
        caption="Seller applications"
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
        emptyMessage={`No ${search.status} applications.`}
        toolbar={
          <NativeSelect
            aria-label="Application status"
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
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </NativeSelect>
        }
      />
      {pending?.kind === "reject" ? (
        <ReasonDialog
          action={{
            to: "cancelled",
            label: "Reject application...",
            kind: "cancel",
            destructive: true,
            description: "The applicant is told why. They can apply again.",
          }}
          orderNumber={pending.app.businessName}
          onClose={() => setPending(null)}
          onSubmit={(note) => {
            decide.mutate({ p: pending, note })
            setPending(null)
          }}
        />
      ) : null}
      <AlertDialog
        open={pending?.kind === "approve"}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Approve {pending?.app.businessName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.app.user.email} becomes a seller: they are signed out
              everywhere and get the seller portal at their next sign-in.
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
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
