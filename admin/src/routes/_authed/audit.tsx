import { useEffect, useMemo, useRef, useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import type { ColumnDef } from "@tanstack/react-table"
import { z } from "zod"

import { DataTable } from "@/components/data-table/DataTable"
import {
  pagingSearch,
  tableHandlers,
  toPagination,
} from "@/components/data-table/url-state"
import { NativeSelect } from "@/components/native-select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import * as api from "@/features/audit/api"
import { DiffView } from "@/features/audit/DiffView"
import { apiPaged } from "@/lib/api/client"
import { requirePermission } from "@/lib/auth/guards"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { formatDateTime } from "@/lib/format"
import { qk } from "@/lib/queryKeys"

const day = z.iso.date().optional().catch(undefined)
const searchSchema = z.object({
  ...pagingSearch,
  actor: z
    .string()
    .regex(/^[0-9a-f]{24}$/i)
    .optional()
    .catch(undefined),
  entity: z.enum(api.AUDIT_ENTITIES).optional().catch(undefined),
  action: z.string().trim().max(100).optional().catch(undefined),
  from: day,
  to: day,
})
type Search = z.infer<typeof searchSchema>

const toParams = (s: Search): api.AuditParams => ({
  actor: s.actor,
  entity: s.entity,
  action: s.action,
  from: s.from,
  to: s.to,
  page: s.page,
  limit: s.pageSize,
})
const listOptions = (p: api.AuditParams) =>
  queryOptions({
    queryKey: qk.audit.list(p),
    queryFn: ({ signal }) => api.listAudit(p, signal),
    placeholderData: keepPreviousData,
  })

export const Route = createFileRoute("/_authed/audit")({
  staticData: { crumb: "Audit log" },
  beforeLoad: ({ context }) => requirePermission(context.user, "audit:view"),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(listOptions(toParams(deps)))
  },
  component: AuditPage,
})

type StaffUser = { id: string; name: string; email: string; role: string }

function AuditPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data, error, isFetching, refetch } = useQuery(
    listOptions(toParams(search))
  )
  // The actor filter needs ids: staff accounts are few, so load them once for a select.
  const staff = useQuery({
    queryKey: [...qk.users.all(), "staff"],
    queryFn: async () => {
      const get = (role: string) =>
        apiPaged<StaffUser>("/admin/users", { query: { role, limit: 100 } })
      const [a, s] = await Promise.all([get("admin"), get("seller")])
      return [...a.items, ...s.items]
    },
    staleTime: 5 * 60_000,
  })

  const patch = (p: Partial<Search>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace })
  const setFilter = (p: Partial<Search>, replace = false) =>
    patch({ ...p, page: 1 }, replace)

  const [text, setText] = useState(search.action ?? "")
  const pushed = useRef(search.action ?? "")
  const debounced = useDebouncedValue(text.trim(), 300)
  useEffect(() => {
    if (debounced !== pushed.current) {
      pushed.current = debounced
      void setFilter({ action: debounced || undefined }, true)
    }
  }, [debounced])

  const columns = useMemo<ColumnDef<api.AuditEntry>[]>(
    () => [
      {
        id: "at",
        header: "When",
        enableSorting: false,
        cell: ({ row }) => formatDateTime(row.original.at),
      },
      {
        id: "actor",
        header: "Actor",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {row.original.actor?.name ?? "(unknown)"}
            <span className="block text-xs text-muted-foreground">
              {row.original.actor?.email}{" "}
              {row.original.role ? `(${row.original.role})` : ""}
            </span>
          </span>
        ),
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) => (
          <code className="text-xs">{row.original.action}</code>
        ),
      },
      {
        id: "targets",
        header: "Target",
        enableSorting: false,
        cell: ({ row }) => (
          <code className="text-xs">
            {row.original.targets.map((t) => t.slice(-6)).join(", ")}
          </code>
        ),
      },
      {
        id: "status",
        header: "Result",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.status}</Badge>
        ),
      },
    ],
    []
  )
  const handlers = tableHandlers(
    { ...search, sort: "x", order: "desc" as const },
    (p) =>
      void patch({
        ...(p.page !== undefined ? { page: p.page } : {}),
        ...(p.pageSize !== undefined ? { pageSize: p.pageSize } : {}),
      })
  )
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Audit log</h1>
      <p className="text-sm text-muted-foreground">
        Every successful change made by an admin or a seller: who, what, when,
        and for the writes that record it, which fields changed. Expand a row to
        see before and after.
      </p>
      <DataTable
        caption="Audit log"
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
        renderSubRow={(r) => (
          <div className="flex flex-col gap-2 py-1">
            <p className="text-xs text-muted-foreground">
              {r.path} {r.ip ? `from ${r.ip}` : ""}{" "}
              {r.requestId ? `(request ${r.requestId})` : ""}
            </p>
            <DiffView changes={r.changes} />
          </div>
        )}
        toolbar={
          <>
            <NativeSelect
              aria-label="Actor"
              value={search.actor ?? ""}
              onChange={(e) =>
                void setFilter({ actor: e.target.value || undefined })
              }
            >
              <option value="">Any actor</option>
              {staff.data?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Entity"
              value={search.entity ?? ""}
              onChange={(e) =>
                void setFilter({
                  entity: (e.target.value || undefined) as Search["entity"],
                })
              }
            >
              <option value="">Any entity</option>
              {api.AUDIT_ENTITIES.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </NativeSelect>
            <Input
              type="search"
              aria-label="Action prefix"
              placeholder="Action, e.g. PATCH /admin/users"
              className="w-60"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <label className="flex items-center gap-1 text-sm">
              From
              <Input
                type="date"
                className="w-36"
                value={search.from ?? ""}
                max={search.to}
                onChange={(e) =>
                  void setFilter({ from: e.target.value || undefined })
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
                onChange={(e) =>
                  void setFilter({ to: e.target.value || undefined })
                }
              />
            </label>
          </>
        }
      />
    </section>
  )
}
