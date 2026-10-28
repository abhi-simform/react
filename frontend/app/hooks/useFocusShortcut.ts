import { useEffect } from "react"

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  )
}

/**
 * Press `key` anywhere (outside form fields) to focus the element behind `ref`.
 * The listener is an external subscription: installed in the effect, removed
 * in its cleanup. The ref is only touched inside the handler, never in render.
 */
export function useFocusShortcut(
  ref: React.RefObject<HTMLElement | null>,
  key = "/"
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== key || event.metaKey || event.ctrlKey || event.altKey)
        return
      if (isTypingTarget(event.target)) return // typing "/" in a field must stay a "/"
      event.preventDefault() // otherwise "/" would also be typed into the input
      ref.current?.focus()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [ref, key])
}
