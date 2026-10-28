import { useId } from "react"

import { cn } from "@/lib/utils"

/** What a control needs to be wired to its label, hint and error. Spread it on the input. */
export type FieldControlProps = {
  id: string
  "aria-invalid": true | undefined
  "aria-describedby": string | undefined
}

type Props = {
  label: React.ReactNode
  /** The message to show; `undefined` = valid. Usually `errors.field?.message`. */
  error?: string
  hint?: React.ReactNode
  className?: string
  /** Render prop: you get the ARIA props and spread them on ANY control (native or custom). */
  children: (control: FieldControlProps) => React.ReactNode
}

/**
 * Label + control + hint + error with the accessibility wiring done once (7.3):
 * - `<label htmlFor>` points at the control's id (click and screen reader name),
 * - `aria-invalid` marks it, `aria-describedby` links the hint and the error, so focusing
 *   the invalid field makes a screen reader read "<label>, invalid entry, <error>",
 * - the error is `role="alert"`, so it is also announced the moment it appears (submit).
 * The control is a render prop, not a fixed `<input>`: the same wrapper serves `register`
 * inputs, `Controller`-bridged widgets, selects and textareas.
 */
export function FormField({ label, error, hint, className, children }: Props) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") ||
    undefined
  return (
    <div className={cn("flex flex-col gap-1 text-sm", className)}>
      <label htmlFor={id}>{label}</label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
