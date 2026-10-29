import { useState } from "react"
import { Input } from "@/components/ui/input"

/**
 * Inline edit for a whole-number cell (price in rupees, stock). Enter or blur commits, Escape
 * cancels. Keyboard operable: the idle state is a real <button>. The commit itself (an
 * optimistic mutation) lives with the caller; this only validates "a whole number >= min".
 */
export function EditableNumberCell({
  value,
  label,
  display,
  min = 0,
  onCommit,
}: {
  value: number
  label: string
  display?: (n: number) => string
  min?: number
  onCommit: (next: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [invalid, setInvalid] = useState(false)

  if (draft === null)
    return (
      <button
        type="button"
        className="rounded px-1 text-left tabular-nums hover:bg-muted"
        aria-label={`Edit ${label}, now ${value}`}
        onClick={() => {
          setInvalid(false)
          setDraft(String(value))
        }}
      >
        {display ? display(value) : value}
      </button>
    )

  const commit = () => {
    const n = Number(draft)
    if (draft.trim() === "" || !Number.isInteger(n) || n < min)
      return setInvalid(true)
    setDraft(null)
    if (n !== value) onCommit(n)
  }
  return (
    <Input
      autoFocus
      inputMode="numeric"
      aria-label={label}
      aria-invalid={invalid}
      className="h-7 w-24"
      value={draft}
      onChange={(e) => {
        setInvalid(false)
        setDraft(e.target.value)
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit()
        if (e.key === "Escape") setDraft(null)
      }}
    />
  )
}
