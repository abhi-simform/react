import { useId, useRef, useState } from "react"
import { useNavigate } from "react-router"

import { useDebounce } from "@/hooks/useDebounce"
import { useFocusShortcut } from "@/hooks/useFocusShortcut"
import { useOnClickOutside } from "@/hooks/useOnClickOutside"
import { paths } from "@/lib/paths"

import { useSuggestions } from "../hooks/useSuggestions"

const MAX_SUGGESTIONS = 5
const DEBOUNCE_MS = 300

/**
 * Header search with an autocomplete listbox (ARIA combobox pattern).
 * Data flow: input `term` -> `useDebounce` (300 ms) -> `useSuggestions`
 * (one aborted-on-change request per pause) -> dropdown.
 */
export function SearchBox() {
  const navigate = useNavigate()
  const listId = useId()
  const [term, setTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1) // highlighted option index, -1 = none
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useOnClickOutside(formRef, () => setOpen(false))
  useFocusShortcut(inputRef) // "/" focuses the search box

  const trimmed = term.trim()
  const debounced = useDebounce(trimmed, DEBOUNCE_MS)
  const suggestions = useSuggestions(debounced)

  const items =
    suggestions.status === "success"
      ? suggestions.data.slice(0, MAX_SUGGESTIONS)
      : []
  // Empty or whitespace-only input never opens the dropdown.
  const isOpen = open && trimmed !== ""
  // Loading while typing (waiting for the pause) or while the request runs.
  const isLoading =
    trimmed !== "" &&
    (trimmed !== debounced || suggestions.status === "loading")

  function choose(index: number) {
    const product = items[index]
    navigate(
      product
        ? paths.product(product.slug)
        : paths.products({ search: trimmed })
    )
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        setOpen(true)
        if (items.length) setActive((a) => (a + 1) % items.length)
        break
      case "ArrowUp":
        event.preventDefault()
        if (items.length) setActive((a) => (a <= 0 ? items.length - 1 : a - 1))
        break
      case "Tab":
        setOpen(false) // keyboard users leaving the field close it too
        break
      case "Escape":
        // First Escape closes the list, the second clears the text.
        if (isOpen) setOpen(false)
        else setTerm("")
        break
    }
  }

  return (
    <form
      ref={formRef}
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        if (trimmed) choose(active)
      }}
    >
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search products
      </label>
      <input
        ref={inputRef}
        id={`${listId}-input`}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          isOpen && active >= 0 ? `${listId}-option-${active}` : undefined
        }
        autoComplete="off"
        placeholder="Search products (press /)"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-56 rounded border p-1 text-sm"
      />
      <div
        hidden={!isOpen}
        className="absolute top-full right-0 left-0 z-20 mt-1 rounded border bg-white p-1 text-sm shadow"
      >
        {isLoading && <p role="status">Searching...</p>}
        {!isLoading && suggestions.status === "error" && (
          <p role="alert" className="text-red-700">
            {suggestions.error.message}
          </p>
        )}
        {!isLoading &&
          suggestions.status === "success" &&
          items.length === 0 && (
            <p role="status">No results for &lsquo;{trimmed}&rsquo;</p>
          )}
        <ul
          id={listId}
          role="listbox"
          aria-label="Suggestions"
          hidden={isLoading || items.length === 0}
        >
          {items.map((product, i) => (
            <li
              key={product._id}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown would blur the input before click fires.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              className={`cursor-pointer truncate rounded px-2 py-1 ${i === active ? "bg-neutral-200" : ""}`}
            >
              {product.name}
            </li>
          ))}
        </ul>
      </div>
    </form>
  )
}
