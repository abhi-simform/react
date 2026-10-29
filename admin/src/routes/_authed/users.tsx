import { useEffect, useMemo, useRef, useState } from "react"
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
  toSorting,
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
import { Input } from "@/components/ui/input"
import * as usersApi from "@/features/users/api"
import type { AdminUser } from "@/features/users/api"
import { requirePermission } from "@/lib/auth/guards"
import type { Role } from "@/lib/auth/session"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { qk } from "@/lib/queryKeys"

const searchSchema = z.object({
  ...pagingSearch,
  sort: z
    .enum(["createdAt", "name", "email", "lastLoginAt"])
    .default("createdAt")
    .catch("createdAt"),
  search: z.string().trim().max(100).optional().catch(undefined),
  role: z.enum(["customer", "seller", "admin"]).optional().catch(undefined),
  isActive: z.boolean().optional().catch(undefined),
})
type Search = z.infer<typeof searchSchema>

const toParams = (s: Search): usersApi.UserListParams => ({
  search: s.search,
  role: s.role,
  isActive: s.isActive,
  sort: s.sort,
  order: s.order,
  page: s.page,
  limit: s.pageSize,
})
const listOptions = (p: usersApi.UserListParams) =>
  queryOptions({
    queryKey: qk.users.list(p),
    queryFn: ({ signal }) => usersApi.listUsers(p, signal),
    placeholderData: keepPreviousData,
  })

export const Route = createFileRoute("/_authed/users")({
  staticData: { crumb: "Users" },
  beforeLoad: ({ context }) => requirePermission(context.user, "users:manage"),
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(listOptions(toParams(deps)))
  },
  component: UsersPage,
})

type Pending =
  | { user: AdminUser; kind: "role"; role: Role }
  | { user: AdminUser; kind: "active"; isActive: boolean }

function UsersPage() {
  const search = Route.useSearch()
  const { user: me } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const queryClient = useQueryClient()
  const { data, error, isFetching, refetch } = useQuery(
    listOptions(toParams(search))
  )
  const [pending, setPending] = useState<Pending | null>(null)

  // Paging, sorting and filter changes PUSH a history entry (Back goes to the previous view);
  // only the debounced search box REPLACES (every keystroke would otherwise be a history entry).
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

  const mutate = useMutation({
    mutationFn: (p: Pending) =>
      p.kind === "role"
        ? usersApi.changeRole(p.user.id, p.role)
        : usersApi.setActive(p.user.id, p.isActive),
    onSuccess: (u) => toast.success(`Updated ${u.email}`),
    onError: (e) => toast.error(e.message), // e.g. SELF_MODIFICATION
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: qk.users.all() }),
  })

  const columns = useMemo<ColumnDef<AdminUser>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) =>
          row.original.role === "seller" ? (
            <Link
              to="/sellers/$sellerId"
              params={{ sellerId: row.original.id }}
              className="underline-offset-2 hover:underline"
            >
              {row.original.name}
            </Link>
          ) : (
            row.original.name
          ),
      },
      { accessorKey: "email", header: "Email" },
      {
        id: "role",
        header: "Role",
        enableSorting: false,
        cell: ({ row }) => (
          <NativeSelect
            aria-label={`Role of ${row.original.email}`}
            value={row.original.role}
            disabled={row.original.id === me.id}
            onChange={(e) =>
              setPending({
                user: row.original,
                kind: "role",
                role: e.target.value as Role,
              })
            }
          >
            <option value="customer">customer</option>
            <option value="seller">seller</option>
            <option value="admin">admin</option>
          </NativeSelect>
        ),
      },
      {
        id: "isActive",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "active" : "deactivated"}
          </Badge>
        ),
      },
      {
        accessorKey: "lastLoginAt",
        header: "Last login",
        cell: ({ row }) =>
          row.original.lastLoginAt
            ? new Date(row.original.lastLoginAt).toLocaleString("en-IN")
            : "never",
      },
      {
        accessorKey: "createdAt",
        header: "Joined",
        cell: ({ row }) =>
          new Date(row.original.createdAt).toLocaleDateString("en-IN"),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row }) =>
          row.original.id === me.id ? (
            <span className="text-muted-foreground">you</span>
          ) : (
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                setPending({
                  user: row.original,
                  kind: "active",
                  isActive: !row.original.isActive,
                })
              }
            >
              {row.original.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          ),
      },
    ],
    [me.id]
  )

  const handlers = tableHandlers(search, (p) => void patch(p))
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-lg font-medium">Users</h1>
      <DataTable
        caption="Users"
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
              aria-label="Search users"
              placeholder="Search name or email"
              className="w-56"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <NativeSelect
              aria-label="Role"
              value={search.role ?? ""}
              onChange={(e) =>
                setFilter({
                  role: (e.target.value || undefined) as Search["role"],
                })
              }
            >
              <option value="">All roles</option>
              <option value="customer">Customers</option>
              <option value="seller">Sellers</option>
              <option value="admin">Admins</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Account status"
              value={
                search.isActive === undefined ? "" : String(search.isActive)
              }
              onChange={(e) =>
                setFilter({
                  isActive:
                    e.target.value === ""
                      ? undefined
                      : e.target.value === "true",
                })
              }
            >
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Deactivated</option>
            </NativeSelect>
          </>
        }
      />

      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.kind === "role"
                ? `Change role to ${pending.role}?`
                : pending?.kind === "active" && !pending.isActive
                  ? "Deactivate this account?"
                  : "Reactivate this account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.user.name} ({pending?.user.email}).{" "}
              {pending?.kind === "role"
                ? "They are signed out everywhere and get the new role on the next sign-in."
                : pending && !pending.isActive
                  ? "They are signed out and cannot sign in until reactivated."
                  : "They can sign in again."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) mutate.mutate(pending)
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
