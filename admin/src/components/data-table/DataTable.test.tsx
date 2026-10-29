import { useState } from "react"
import type {
  ColumnDef,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { axe } from "vitest-axe"
import { describe, expect, it, vi } from "vitest"

import { DataTable } from "./DataTable"

type Row = { id: string; name: string; price: number }
const rows: Row[] = [
  { id: "1", name: "Alpha", price: 100 },
  { id: "2", name: "Beta", price: 250 },
]
const columns: ColumnDef<Row>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "price", header: "Price" },
  { id: "note", header: "Note", enableSorting: false, cell: () => "-" },
]
const meta = {
  page: 1,
  limit: 20,
  total: 45,
  totalPages: 3,
  hasNext: true,
  hasPrev: false,
}

/** A controlled harness: the table is manual, so the PARENT owns sorting and paging (as the URL does). */
function Harness(
  props: Partial<React.ComponentProps<typeof DataTable<Row>>> & {
    onSort?: (s: SortingState) => void
    onPage?: (p: PaginationState) => void
  }
) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  return (
    <DataTable<Row>
      caption="Test rows"
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      meta={meta}
      sorting={sorting}
      onSortingChange={(u) => {
        const next = typeof u === "function" ? u(sorting) : u
        setSorting(next)
        props.onSort?.(next)
      }}
      pagination={pagination}
      onPaginationChange={(u) => {
        const next = typeof u === "function" ? u(pagination) : u
        setPagination(next)
        props.onPage?.(next)
      }}
      {...props}
    />
  )
}

describe("<DataTable>", () => {
  it("is a real table with a caption, column headers and aria-sort on sortable columns", () => {
    render(<Harness />)
    const table = screen.getByRole("table", { name: "Test rows" })
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3)
    expect(screen.getByRole("columnheader", { name: /name/i })).toHaveAttribute(
      "aria-sort",
      "ascending"
    )
    expect(
      screen.getByRole("columnheader", { name: /price/i })
    ).toHaveAttribute("aria-sort", "none")
    // a non-sortable column has no aria-sort at all (it would be a lie)
    expect(
      screen.getByRole("columnheader", { name: "Note" })
    ).not.toHaveAttribute("aria-sort")
    expect(screen.getAllByRole("row")).toHaveLength(3) // header + 2 rows
  })

  it("asks the PARENT to sort (manual mode): clicking a header reports the new sorting", async () => {
    const onSort = vi.fn()
    render(<Harness onSort={onSort} />)
    await userEvent.click(screen.getByRole("button", { name: /price/i }))
    // TanStack sorts a NUMERIC column descending first (biggest on top), text ascending first.
    expect(onSort).toHaveBeenCalledWith([{ id: "price", desc: true }])
    expect(
      screen.getByRole("columnheader", { name: /price/i })
    ).toHaveAttribute("aria-sort", "descending")
    await userEvent.click(screen.getByRole("button", { name: /price/i }))
    expect(onSort).toHaveBeenLastCalledWith([{ id: "price", desc: false }])
  })

  it("pages through the server's total, disabling Previous on the first page", async () => {
    const onPage = vi.fn()
    render(<Harness onPage={onPage} />)
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument()
    expect(screen.getByText(/45 rows/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(onPage).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 20 })
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument()
  })

  it("shows the empty state, but not while a refetch is still running (no empty flash)", () => {
    const { rerender } = render(
      <Harness data={[]} emptyMessage="Nothing here." />
    )
    expect(screen.getByText("Nothing here.")).toBeInTheDocument()
    rerender(<Harness data={[]} emptyMessage="Nothing here." isFetching />)
    expect(screen.queryByText("Nothing here.")).not.toBeInTheDocument()
    expect(screen.getByText(/updating/)).toBeInTheDocument()
  })

  it("shows an error with a Retry that calls back", async () => {
    const onRetry = vi.fn()
    render(<Harness error={new Error("Boom")} onRetry={onRetry} />)
    expect(screen.getByRole("alert")).toHaveTextContent("Boom")
    await userEvent.click(screen.getByRole("button", { name: "Retry" }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it("row selection reveals a bulk bar with the selected ids; Clear hides it", async () => {
    const bulk = vi.fn()
    render(
      <Harness
        selectable
        renderBulkBar={(ids) => (
          <button onClick={() => bulk(ids)}>Archive</button>
        )}
      />
    )
    expect(
      screen.queryByRole("region", { name: "Bulk actions" })
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Select row 2" })
    )
    const bar = screen.getByRole("region", { name: "Bulk actions" })
    expect(bar).toHaveTextContent("1 selected")
    await userEvent.click(within(bar).getByRole("button", { name: "Archive" }))
    expect(bulk).toHaveBeenCalledWith(["2"])
    await userEvent.click(within(bar).getByRole("button", { name: "Clear" }))
    expect(
      screen.queryByRole("region", { name: "Bulk actions" })
    ).not.toBeInTheDocument()
  })

  it("expands a row on demand (aria-expanded) and not for rows with nothing to show", async () => {
    render(
      <Harness
        renderSubRow={(r) => (r.id === "1" ? <p>Details of {r.name}</p> : null)}
      />
    )
    const toggles = screen.getAllByRole("button", { name: "Show details" })
    expect(toggles).toHaveLength(1) // row 2 returned null: no button
    expect(toggles[0]).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggles[0])
    expect(screen.getByText("Details of Alpha")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Hide details" })
    ).toHaveAttribute("aria-expanded", "true")
  })

  it("has no axe violations", async () => {
    const { container } = render(<Harness selectable />)
    expect(await axe(container)).toHaveNoViolations()
  })
})
