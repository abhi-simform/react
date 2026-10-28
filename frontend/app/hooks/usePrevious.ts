import { useState } from "react"

/**
 * The value from the render BEFORE `value` last changed (undefined at first).
 *
 * The classic version stores it in a ref and returns `ref.current` from render,
 * but reading a ref during render is exactly what the react-hooks lint rule
 * (and the "refs are not for UI output" guideline) forbids: the ref changes
 * without scheduling a render, so what you read depends on render timing.
 * Adjusting state while rendering is the supported alternative: React
 * re-renders immediately, before painting, with a consistent result.
 */
export function usePrevious<T>(value: T): T | undefined {
  const [tracked, setTracked] = useState<{ current: T; previous?: T }>({
    current: value,
  })
  if (!Object.is(tracked.current, value)) {
    setTracked({ current: value, previous: tracked.current })
  }
  return tracked.previous
}
