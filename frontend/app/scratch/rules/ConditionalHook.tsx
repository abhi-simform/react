/* eslint-disable react-hooks/rules-of-hooks -- BROKEN ON PURPOSE (4.4): demonstrates why the rule exists */
import { useState } from "react"

import { useDebounce } from "@/hooks/useDebounce"

/**
 * Calls a hook inside an `if`. On the first render `enabled` is false (2 hooks
 * run), after the click it is true (3 hooks run): React matches hooks by CALL
 * ORDER, so the count changes and it throws
 * "Rendered more hooks than during the previous render".
 */
export function ConditionalHook() {
  const [enabled, setEnabled] = useState(false)
  const [text] = useState("hello")
  if (enabled) {
    const debounced = useDebounce(text, 100)
    return <p>{debounced}</p>
  }
  return <button onClick={() => setEnabled(true)}>Enable (will crash)</button>
}
