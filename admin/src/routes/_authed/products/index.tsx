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
import { listPublicCategories, flattenTree } from "@/features/categories/api"
import * as productsApi from "@/features/products/api"
import { EditableNumberCell } from "@/features/products/EditableNumberCell"
import {
  productListOptions,
  useArchiveProduct,
  useBulkStatus,
  useInlineProductEdit,
} from "@/features/products/queries"
import type { ProductRow } from "@/features/products/types"
import { can } from "@/lib/auth/can"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"
import { downloadText } from "@/lib/download"
import { formatRupees } from "@/lib/money"
import { qk } from "@/lib/queryKeys"

const SORTS = [
  "createdAt",
  "updatedAt",
  "name",
  "price",
  "stock",
  "soldCount",
] as const

// The URL IS the table state. `.catch` turns a hand-edited garbage value back into the default
// instead of an error page.
const searchSchema = z.object({
  ...pagingSearch,
  sort: z.enum(SORTS).default("createdAt").catch("createdAt"),
  search: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(["active", "draft", "archived"]).optional().catch(undefined),
  category: z.string().optional().catch(undefined),
  lowStock: z.boolean().optional().catch(undefined),
  // Admin only (the seller detail page links here): the API ignores it for sellers.
  seller: z
    .string()
    .regex(/^[0-9a-f]{24}$/i)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute("/_authed/products/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  // Warm the cache while the route transitions; the component's useQuery owns the display.
  loader: ({ context, deps }) => {
    void context.queryClient.prefetchQuery(productListOptions(toParams(deps)))
  },
  component: ProductsPage,
})

type Search = z.infer<typeof searchSchema>
const toParams = (s: Search) => ({
  search: s.search,
  status: s.status,
  category: s.category,
  lowStock: s.lowStock || undefined,
  seller: s.seller,
  sort: s.sort,
  order: s.order,
  page: s.page,
  limit: s.pageSize,
})

function ProductsPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const { user } = Route.useRouteContext()
  const params = toParams(search)

  const { data, error, isFetching, refetch } = useQuery(
    productListOptions(params)
  )
  const categories = useQuery({
    queryKey: qk.categories.public(),
    queryFn: listPublicCategories,
    staleTime: 5 * 60_000,
  })
  const inlineEdit = useInlineProductEdit()
  const archive = useArchiveProduct()
  const bulk = useBulkStatus()
  const [toArchive, setToArchive] = useState<ProductRow | null>(null)
  const [bulkIds, setBulkIds] = useState<{
    ids: string[]
    clear: () => void
  } | null>(null)

  // A filter change goes back to page 1 (the old page number may not exist in the new result).
  // Paging, sorting and filter changes PUSH a history entry (Back goes to the previous view);
  // only the debounced search box REPLACES (every keystroke would otherwise be a history entry).
  const patch = (p: Partial<Search>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...p }), replace })
  const setFilter = (p: Partial<Search>, replace = false) =>
    patch({ ...p, page: 1 }, replace)

  // Debounced search box <-> URL. `pushed` remembers what WE wrote so that our own URL update is
  // not mistaken for back/forward navigation (which should overwrite the input).
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

  const writable = can(user, "products:write")
  const columns = useMemo<ColumnDef<ProductRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <Link
            to="/products/$productId"
            params={{ productId: row.original._id }}
            className="font-medium underline-offset-2 hover:underline"
          >
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: "sku", header: "SKU", enableSorting: false },
      { accessorKey: "brand", header: "Brand", enableSorting: false },
      {
        id: "category",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => row.original.category?.name ?? "-",
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) =>
          writable ? (
            <EditableNumberCell
              label={`Price of ${row.original.name}`}
              value={row.original.price}
              display={formatRupees}
              min={1}
              onCommit={(price) =>
                inlineEdit.mutate({ id: row.original._id, patch: { price } })
              }
            />
          ) : (
            formatRupees(row.original.price)
          ),
      },
      {
        accessorKey: "stock",
        header: "Stock",
        cell: ({ row }) =>
          writable ? (
            <EditableNumberCell
              label={`Stock of ${row.original.name}`}
              value={row.original.stock}
              onCommit={(stock) =>
                inlineEdit.mutate({ id: row.original._id, patch: { stock } })
              }
            />
          ) : (
            row.original.stock
          ),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === "active" ? "default" : "secondary"}
          >
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: "seller",
        header: "Seller",
        enableSorting: false,
        cell: ({ row }) => row.original.seller?.name ?? "-",
      },
      { accessorKey: "soldCount", header: "Sold" },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) =>
          new Date(row.original.updatedAt).toLocaleDateString("en-IN"),
      },
      {
        id: "actions",
        header: "Actions",
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              size="xs"
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to="/products/$productId"
                  params={{ productId: row.original._id }}
                />
              }
            >
              Edit
            </Button>
            {writable && row.original.status !== "archived" ? (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setToArchive(row.original)}
              >
                Archive
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [writable]
  )

  async function exportCsv() {
    try {
      const { page: _p, limit: _l, ...filters } = params
      downloadText("products.csv", await productsApi.exportProductsCsv(filters))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed")
    }
  }

  const flat = flattenTree(categories.data ?? [])
  const handlers = tableHandlers(search, (p) => void patch(p))

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">Products</h1>
        {writable ? (
          <Button
            nativeButton={false}
            render={<Link to="/products/new" search={{}} />}
          >
            New product
          </Button>
        ) : null}
      </div>

      <DataTable
        caption="Products"
        columns={columns}
        data={data?.items ?? []}
        getRowId={(r) => r._id}
        meta={data?.meta}
        sorting={toSorting(search)}
        pagination={toPagination(search)}
        {...handlers}
        isFetching={isFetching}
        error={error}
        onRetry={() => void refetch()}
        selectable={writable}
        renderBulkBar={(ids, clear) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkIds({ ids, clear })}
          >
            Archive selected
          </Button>
        )}
        toolbar={
          <>
            <Input
              type="search"
              aria-label="Search products"
              placeholder="Search name, SKU, brand"
              className="w-56"
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
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </NativeSelect>
            <NativeSelect
              aria-label="Category"
              value={search.category ?? ""}
              onChange={(e) =>
                setFilter({ category: e.target.value || undefined })
              }
            >
              <option value="">All categories</option>
              {flat.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
            <label className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                checked={!!search.lowStock}
                onChange={(e) =>
                  setFilter({ lowStock: e.target.checked || undefined })
                }
              />
              Low stock
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void exportCsv()}
            >
              Export CSV
            </Button>
          </>
        }
      />

      <AlertDialog
        open={!!toArchive}
        onOpenChange={(o) => !o && setToArchive(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this product?</AlertDialogTitle>
            <AlertDialogDescription>
              {toArchive?.name} disappears from the storefront. Order history is
              kept and you can set it back to active later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (toArchive) archive.mutate(toArchive._id)
                setToArchive(null)
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!bulkIds}
        onOpenChange={(o) => !o && setBulkIds(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Archive {bulkIds?.ids.length} products?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They are hidden from the storefront. Products that are not yours
              are skipped by the API.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (bulkIds)
                  bulk.mutate(
                    { ids: bulkIds.ids, status: "archived" },
                    { onSuccess: () => bulkIds.clear() }
                  )
                setBulkIds(null)
              }}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
