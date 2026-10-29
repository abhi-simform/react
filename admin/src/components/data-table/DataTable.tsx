import { Fragment, useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { NativeSelect } from "@/components/native-select"
import type { PageMeta } from "@/lib/api/client"

export const PAGE_SIZES = [10, 20, 50, 100] as const

type Props<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  getRowId: (row: TData) => string
  /** The server's paging meta: `total` drives the page count (manual pagination). */
  meta: PageMeta | undefined
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
  /** True while a refetch runs and the previous page is still shown (no empty flash). */
  isFetching?: boolean
  error?: Error | null
  onRetry?: () => void
  emptyMessage?: string
  /** Enables the checkbox column. Rendered above the table when something is selected. */
  selectable?: boolean
  renderBulkBar?: (selectedIds: string[], clear: () => void) => React.ReactNode
  /** Extra controls in the toolbar (filters, export). */
  toolbar?: React.ReactNode
  /**
   * Expandable rows: a disclosure button in a leading column; `render` returns the detail for a row
   * (or `null` when that row has nothing to expand: the button is then not rendered).
   */
  renderSubRow?: (row: TData) => React.ReactNode
  caption: string
}

/**
 * ONE generic table for products, users, (later) orders. TanStack Table is HEADLESS: it computes
 * state and row models, this component decides the markup. All three of sort, filter and
 * paging are MANUAL: the server does them (the table would otherwise only sort the 20 rows it
 * holds), and the URL owns the state, passed in through `sorting` / `pagination`.
 */
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  meta,
  sorting,
  onSortingChange,
  pagination,
  onPaginationChange,
  isFetching,
  error,
  onRetry,
  emptyMessage = "Nothing matches these filters.",
  selectable,
  renderBulkBar,
  toolbar,
  renderSubRow,
  caption,
}: Props<TData>) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})

  const allColumns = useMemo<ColumnDef<TData>[]>(() => {
    const base: ColumnDef<TData>[] = renderSubRow
      ? [
          {
            id: "expand",
            enableSorting: false,
            enableHiding: false,
            header: () => <span className="sr-only">Details</span>,
            cell: ({ row }) =>
              renderSubRow(row.original) === null ? null : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-expanded={!!expanded[row.id]}
                  aria-label={
                    expanded[row.id] ? "Hide details" : "Show details"
                  }
                  onClick={() =>
                    setExpanded((e) => ({ ...e, [row.id]: !e[row.id] }))
                  }
                >
                  {expanded[row.id] ? (
                    <ChevronDown aria-hidden />
                  ) : (
                    <ChevronRight aria-hidden />
                  )}
                </Button>
              ),
          },
          ...columns,
        ]
      : columns
    return selectable
      ? [
          {
            id: "select",
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) => (
              <Checkbox
                aria-label="Select all rows on this page"
                checked={table.getIsAllPageRowsSelected()}
                indeterminate={table.getIsSomePageRowsSelected()}
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                aria-label={`Select row ${row.index + 1}`}
                checked={row.getIsSelected()}
                onCheckedChange={(v) => row.toggleSelected(!!v)}
              />
            ),
          },
          ...base,
        ]
      : base
  }, [columns, selectable, renderSubRow, expanded])

  const table = useReactTable({
    data,
    columns: allColumns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: meta?.total ?? 0,
    enableRowSelection: selectable,
    enableSortingRemoval: false,
    state: { sorting, pagination, rowSelection, columnVisibility },
    onSortingChange,
    onPaginationChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
  })

  const selectedIds = Object.keys(rowSelection).filter((id) => rowSelection[id])
  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {toolbar}
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Columns
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllLeafColumns()
              .filter((c) => c.getCanHide())
              .map((c) => (
                <DropdownMenuCheckboxItem
                  key={c.id}
                  checked={c.getIsVisible()}
                  onCheckedChange={(v) => c.toggleVisibility(!!v)}
                >
                  {typeof c.columnDef.header === "string"
                    ? c.columnDef.header
                    : c.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectable && selectedIds.length > 0 && renderBulkBar ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex items-center gap-3 rounded border bg-muted px-3 py-2 text-sm"
        >
          <span>{selectedIds.length} selected</span>
          {renderBulkBar(selectedIds, () => setRowSelection({}))}
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>
            Clear
          </Button>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded border border-destructive p-3 text-sm"
        >
          <p>{error.message}</p>
          {onRetry ? (
            <Button
              className="mt-2"
              size="sm"
              variant="outline"
              onClick={onRetry}
            >
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* The scroller is HERE (not shadcn's wrapper) so `sticky` headers stick to it. */}
      <div
        className="max-h-[65vh] overflow-auto rounded border [&_[data-slot=table-container]]:overflow-visible"
        aria-busy={isFetching}
      >
        <Table>
          <caption className="sr-only">{caption}</caption>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-[0_1px_0_var(--border)]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted()
                  return (
                    <TableHead
                      key={h.id}
                      aria-sort={
                        !h.column.getCanSort()
                          ? undefined
                          : sorted === "asc"
                            ? "ascending"
                            : sorted === "desc"
                              ? "descending"
                              : "none"
                      }
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 font-medium"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext()
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp aria-hidden className="size-3" />
                          ) : sorted === "desc" ? (
                            <ArrowDown aria-hidden className="size-3" />
                          ) : (
                            <ChevronsUpDown
                              aria-hidden
                              className="size-3 opacity-40"
                            />
                          )}
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={isFetching ? "opacity-60 transition-opacity" : undefined}
          >
            {rows.length === 0 && !isFetching && !error ? (
              <TableRow>
                <TableCell
                  colSpan={allColumns.length}
                  className="py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <Fragment key={row.id}>
                  <TableRow
                    data-state={row.getIsSelected() ? "selected" : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {renderSubRow && expanded[row.id] ? (
                    <TableRow>
                      <TableCell
                        colSpan={allColumns.length}
                        className="bg-muted/30"
                      >
                        {renderSubRow(row.original)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span aria-live="polite">
          {meta ? `${meta.total} rows` : ""} {isFetching ? "(updating...)" : ""}
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1">
            Rows
            <NativeSelect
              value={pagination.pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </NativeSelect>
          </label>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Previous
          </Button>
          <span>
            Page {pagination.pageIndex + 1} of {Math.max(1, pageCount)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
