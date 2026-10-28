import { useEffect, useRef } from "react"

/** A ref that always holds the newest `value`: read `.current` inside callbacks/timers, never in render. */
export function useLatest<T>(value: T): React.RefObject<T> {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}
