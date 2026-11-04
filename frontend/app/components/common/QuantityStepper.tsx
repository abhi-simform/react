import { Minus, Plus } from "lucide-react"
import { useId, useState } from "react"

type QuantityStepperProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  /** Usually the stock. */
  max: number
  label?: string
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/**
 * Controlled stepper. Two kinds of state, kept apart on purpose:
 * - `value` (committed, always a valid integer in [min, max]) is the parent's;
 * - `draft` is what the user is typing right now (a string, may be "" or "abc").
 * Only valid input is committed while typing; blur / Enter clamp and reset
 * the draft. A `type="number"` input would still hand us "", "-", "1e3", so
 * this is a text input with `inputMode="numeric"`.
 */
export function QuantityStepper({
  value,
  onValueChange,
  min = 1,
  max,
  label = "Quantity",
}: QuantityStepperProps) {
  const id = useId()
  const [draft, setDraft] = useState<string | null>(null)
  const effectiveMax = Math.max(min, max)

  function commitDraft() {
    if (draft !== null && /^-?\d+$/.test(draft.trim())) {
      onValueChange(clamp(Number(draft), min, effectiveMax))
    }
    // "", "abc": ignore and fall back to the last committed value
    setDraft(null)
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const text = event.target.value
    setDraft(text)
    if (/^\d+$/.test(text)) {
      const n = Number(text)
      if (n >= min && n <= effectiveMax) onValueChange(n)
    }
  }

  return (
    <div className="inline-flex items-center gap-1">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => {
          setDraft(null)
          onValueChange(clamp(value - 1, min, effectiveMax))
        }}
        className="rounded border p-1 disabled:opacity-40"
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={draft ?? String(value)}
        onChange={onChange}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            commitDraft()
          }
        }}
        className="w-12 rounded border p-1 text-center"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= effectiveMax}
        onClick={() => {
          setDraft(null)
          onValueChange(clamp(value + 1, min, effectiveMax))
        }}
        className="rounded border p-1 disabled:opacity-40"
      >
        <Plus aria-hidden className="size-4" />
      </button>
      <span aria-live="polite" className="sr-only">
        {label} {value}
      </span>
    </div>
  )
}
