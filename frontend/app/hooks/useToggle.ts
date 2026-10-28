import { useCallback, useState } from "react"

/** `as const` makes the return a fixed tuple [boolean, () => void, (v: boolean) => void], not a union array. */
export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback(() => setValue((v) => !v), [])
  return [value, toggle, setValue] as const
}
