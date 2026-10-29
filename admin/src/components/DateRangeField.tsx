import { useState } from "react"
import { format, parseISO } from "date-fns"
import { DayPicker, type DateRange } from "react-day-picker"
import "react-day-picker/style.css"

import { Button } from "@/components/ui/button"

type Props = {
  label: string
  from: string | undefined // YYYY-MM-DD
  to: string | undefined
  onChange: (range: { from?: string; to?: string }) => void
  error?: string
}

const day = (d: Date) => format(d, "yyyy-MM-dd")
const parse = (s?: string) => (s ? parseISO(s) : undefined)

/**
 * A date RANGE as two `YYYY-MM-DD` strings (calendar days, read as India days by the caller).
 * The calendar is react-day-picker in range mode; the days are also shown as text so a screen
 * reader or keyboard user is never forced through the grid. The parent owns the values.
 */
export function DateRangeField({ label, from, to, onChange, error }: Props) {
  const [open, setOpen] = useState(false)
  const selected: DateRange | undefined = from
    ? { from: parse(from), to: parse(to) }
    : undefined
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span aria-live="polite">
          {from ? format(parseISO(from), "d MMM yyyy") : "No start"}
          {" to "}
          {to ? format(parseISO(to), "d MMM yyyy") : "no end"}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide calendar" : "Pick dates"}
        </Button>
        {from || to ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange({})}
          >
            Clear
          </Button>
        ) : null}
      </div>
      {open ? (
        <DayPicker
          mode="range"
          selected={selected}
          onSelect={(r) =>
            onChange({
              from: r?.from ? day(r.from) : undefined,
              to: r?.to ? day(r.to) : undefined,
            })
          }
          numberOfMonths={1}
        />
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  )
}
