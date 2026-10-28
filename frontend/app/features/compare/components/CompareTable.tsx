import { useSearchParams } from "react-router"

import { Switch } from "@/components/ui/switch"
import { formatCurrency } from "@/lib/format"
import { toPaise } from "@/lib/money"
import { cn } from "@/lib/utils"

import { removeFromCompare } from "../undo"

/** Structural: any API product detail fits. The compare feature must not import the catalog. */
export type ComparableProduct = {
  _id: string
  name: string
  brand: string
  price: number
  mrp: number
  ratingAvg: number
  ratingCount: number
  stock: number
  images: readonly { url: string }[]
  specs: readonly { key: string; value: string }[]
}

type Row = { label: string; values: string[] }

/** Pure: the rows of the table, one string per product. */
export function buildRows(products: readonly ComparableProduct[]): Row[] {
  const base: Row[] = [
    {
      label: "Price",
      values: products.map((p) => formatCurrency(toPaise(p.price))),
    },
    { label: "Brand", values: products.map((p) => p.brand) },
    {
      label: "Rating",
      values: products.map((p) =>
        p.ratingCount > 0
          ? `${p.ratingAvg.toFixed(1)} (${p.ratingCount})`
          : "No ratings yet"
      ),
    },
    {
      label: "Availability",
      values: products.map((p) => (p.stock > 0 ? "In stock" : "Out of stock")),
    },
  ]
  // Every spec key that ANY product has, in first-seen order; a missing one shows as "-".
  const keys = [...new Set(products.flatMap((p) => p.specs.map((s) => s.key)))]
  const specRows = keys.map((key) => ({
    label: key,
    values: products.map(
      (p) => p.specs.find((s) => s.key === key)?.value ?? "-"
    ),
  }))
  return [...base, ...specRows]
}

/** A row "differs" when not every product has the same value. Derived, never stored. */
export const differs = (row: Row) => new Set(row.values).size > 1

export function CompareTable({
  products,
}: {
  products: readonly ComparableProduct[]
}) {
  // The view lives in the URL (`?diff=1`, 8.4 migration): shareable, survives reload and Back.
  const [searchParams, setSearchParams] = useSearchParams()
  const onlyDifferences = searchParams.get("diff") === "1"
  function setOnlyDifferences(on: boolean) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current)
        if (on) params.set("diff", "1")
        else params.delete("diff")
        return params
      },
      { replace: true }
    )
  }
  const rows = buildRows(products)
  const shown = onlyDifferences ? rows.filter(differs) : rows
  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit items-center gap-2 text-sm">
        <Switch
          checked={onlyDifferences}
          onCheckedChange={setOnlyDifferences}
        />
        Show only differences
      </label>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">
            Product comparison. Rows that differ are marked.
          </caption>
          <thead>
            <tr>
              <td className="p-2" />
              {products.map((p) => (
                <th key={p._id} scope="col" className="p-2 align-top">
                  <img
                    src={p.images[0]?.url ?? "/placeholder.svg"}
                    alt=""
                    width={64}
                    height={64}
                    className="mb-1 size-16 rounded object-cover"
                  />
                  <p>{p.name}</p>
                  <button
                    type="button"
                    className="mt-1 rounded border px-1 text-xs font-normal"
                    onClick={() => removeFromCompare(p._id)}
                  >
                    Remove<span className="sr-only"> {p.name}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => {
              const different = differs(row)
              return (
                <tr
                  key={row.label}
                  data-differs={different || undefined}
                  className={cn("border-t", different && "bg-amber-100")}
                >
                  <th scope="row" className="p-2 font-medium">
                    {row.label}
                    {different && (
                      <span className="ml-1 text-xs font-normal">
                        (differs)
                      </span>
                    )}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={products[i]?._id} className="p-2">
                      {value}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {onlyDifferences && shown.length === 0 && (
        <p>These products have identical details.</p>
      )}
    </div>
  )
}
