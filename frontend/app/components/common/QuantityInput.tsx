import { cn } from "@/lib/utils"

type QuantityInputProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
} & Omit<
  React.ComponentProps<"input">,
  "value" | "onChange" | "type" | "min" | "max"
>

/** Controlled numeric input: parent owns the number, this owns event parsing and clamping. */
export function QuantityInput({
  value,
  onValueChange,
  min = 1,
  max = 99,
  className,
  ...props
}: QuantityInputProps) {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const parsed = event.target.valueAsNumber // NaN for "" or non-numeric text
    if (Number.isNaN(parsed)) return
    onValueChange(Math.min(max, Math.max(min, Math.trunc(parsed))))
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      className={cn("w-16 border p-1", className)}
      value={value}
      min={min}
      max={max}
      onChange={handleChange}
      {...props}
    />
  )
}
