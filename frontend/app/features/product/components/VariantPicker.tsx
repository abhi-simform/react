import { useId } from "react"

import { cn } from "@/lib/utils"
import type { Variant } from "@/types/domain"

import {
  attributeNames,
  isOptionAvailable,
  optionValues,
  selectOption,
  type Selection,
} from "../variants"

type VariantPickerProps = {
  variants: readonly Variant[]
  selection: Selection
  onSelectionChange: (selection: Selection) => void
}

/** Controlled: the parent owns `selection`; the matching variant is derived there. */
export function VariantPicker({
  variants,
  selection,
  onSelectionChange,
}: VariantPickerProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3">
      {attributeNames(variants).map((name) => (
        <fieldset key={name}>
          <legend className="mb-1 text-sm font-medium capitalize">
            {name}
            {selection[name] ? `: ${selection[name]}` : ""}
          </legend>
          <div className="flex flex-wrap gap-2">
            {optionValues(variants, name).map((value) => {
              // Dimmed (`!fits`): no in-stock variant with this value AND the
              // other chosen options. Disabled (`!exists`): none at all.
              const fits = isOptionAvailable(variants, selection, name, value)
              const exists = isOptionAvailable(variants, {}, name, value)
              const selected = selection[name] === value
              const inputId = `${id}-${name}-${value}`
              return (
                <div key={value}>
                  <input
                    id={inputId}
                    type="radio"
                    name={`${id}-${name}`}
                    value={value}
                    checked={selected}
                    // A dimmed option stays clickable: choosing it clears the
                    // other attribute that conflicts (see selectOption).
                    disabled={!exists}
                    onChange={() =>
                      onSelectionChange(
                        selectOption(variants, selection, name, value)
                      )
                    }
                    className="peer sr-only"
                  />
                  <label
                    htmlFor={inputId}
                    className={cn(
                      "block cursor-pointer rounded border px-3 py-1 text-sm peer-focus-visible:ring-2",
                      selected && "border-black bg-black text-white",
                      !fits && !selected && "text-neutral-500 line-through",
                      !exists && "cursor-not-allowed"
                    )}
                  >
                    {value}
                  </label>
                </div>
              )
            })}
          </div>
        </fieldset>
      ))}
    </div>
  )
}
