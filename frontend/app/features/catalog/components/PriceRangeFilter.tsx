import { useState } from "react"

import { useDebouncedCallback } from "@/hooks/useDebounce"
import { formatRupees } from "@/lib/format"

import type { PriceBucket } from "../utils"

type PriceRangeFilterProps = {
  min?: number
  max?: number
  /** Cheapest / dearest product in the current result set (facet), used as placeholders. */
  bounds?: { min: number; max: number }
  histogram: readonly PriceBucket[]
  onChange: (
    min: number | undefined,
    max: number | undefined,
    options?: { replace?: boolean }
  ) => void
}

const toNumber = (text: string) => {
  if (text.trim() === "") return undefined // "" means no limit, never 0
  const n = Number(text)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

/**
 * Two number inputs + histogram bars. The URL stays the source of truth: the
 * boxes show a DRAFT only while the user is typing; 500 ms after the last
 * keystroke the value is committed to the URL with `replace` (typing is
 * transient: one history entry, not one per digit) and the draft is dropped.
 * A bar is a discrete choice, so it pushes a history entry.
 */
export function PriceRangeFilter({
  min,
  max,
  bounds,
  histogram,
  onChange,
}: PriceRangeFilterProps) {
  const [draft, setDraft] = useState<{ min?: string; max?: string }>({})
  const shownMin = draft.min ?? min?.toString() ?? ""
  const shownMax = draft.max ?? max?.toString() ?? ""

  const commit = useDebouncedCallback((nextMin: string, nextMax: string) => {
    onChange(toNumber(nextMin), toNumber(nextMax), { replace: true })
    setDraft({})
  }, 500)

  const peak = Math.max(1, ...histogram.map((b) => b.count))

  return (
    <fieldset className="text-sm">
      <legend className="font-medium">Price</legend>
      {histogram.length > 0 && (
        <ul
          className="my-2 flex h-12 items-end gap-0.5"
          aria-label="Price distribution"
        >
          {histogram.map((b) => (
            <li key={b.from} className="flex-1">
              <button
                type="button"
                title={`${formatRupees(b.from)} - ${formatRupees(b.to)}: ${b.count} products`}
                aria-label={`${formatRupees(b.from)} to ${formatRupees(b.to)}, ${b.count} products`}
                aria-pressed={min === b.from && max === b.to}
                onClick={() => onChange(b.from, b.to)}
                style={{ height: `${Math.max(8, (b.count / peak) * 100)}%` }}
                className="w-full bg-neutral-300 aria-pressed:bg-neutral-700"
              />
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <label className="flex-1">
          <span className="sr-only">Minimum price</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={bounds ? String(bounds.min) : "Min"}
            value={shownMin}
            onChange={(e) => {
              setDraft((d) => ({ ...d, min: e.target.value }))
              commit(e.target.value, shownMax)
            }}
            className="w-full rounded border p-1"
          />
        </label>
        <span aria-hidden>to</span>
        <label className="flex-1">
          <span className="sr-only">Maximum price</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            placeholder={bounds ? String(bounds.max) : "Max"}
            value={shownMax}
            onChange={(e) => {
              setDraft((d) => ({ ...d, max: e.target.value }))
              commit(shownMin, e.target.value)
            }}
            className="w-full rounded border p-1"
          />
        </label>
      </div>
    </fieldset>
  )
}
