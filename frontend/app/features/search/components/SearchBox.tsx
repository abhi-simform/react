import { useId, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router"

import { useDebounce } from "@/hooks/useDebounce"
import { useFocusShortcut } from "@/hooks/useFocusShortcut"
import { useOnClickOutside } from "@/hooks/useOnClickOutside"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import { useRecentSearches } from "../hooks/useRecentSearches"
import { useSuggestions } from "../hooks/useSuggestions"
import { buildGroups, flatten } from "../options"
import { MIN_TERM, normalizeTerm } from "../term"
import { SuggestionList } from "./SuggestionList"

const DEBOUNCE_MS = 250

/**
 * Header search: an ARIA 1.2 combobox (editable input + listbox popup, DOM focus stays in the
 * input, `aria-activedescendant` names the active option).
 * Pipeline: keypress -> `term` state -> `useDebounce` (250 ms) -> normalised key -> `useQuery`
 * (cancelled when the key changes, cached per term, `keepPreviousData` against flicker) ->
 * `buildGroups` (pure) -> `SuggestionList`. Arrow keys move an index over the flat options.
 */
export function SearchBox() {
  const navigate = useNavigate()
  const id = useId()
  const listId = `${id}-list`
  const [term, setTerm] = useState("")
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState<string | undefined>()
  const inputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useOnClickOutside(formRef, () => setOpen(false))
  useFocusShortcut(inputRef) // "/" focuses the search box

  const { recent, add, clear } = useRecentSearches()
  const typed = term.trim()
  const debounced = useDebounce(normalizeTerm(term), DEBOUNCE_MS)
  const suggestions = useSuggestions(debounced)

  const groups = useMemo(
    () =>
      buildGroups({
        term: typed,
        // Under the minimum there is no data to show (the query is disabled).
        data: typed.length >= MIN_TERM ? suggestions.data : undefined,
        recent,
      }),
    [typed, suggestions.data, recent]
  )
  const options = useMemo(() => flatten(groups), [groups])
  // If the data changed under the active option and it is gone, nothing is active.
  const active = options.find((o) => o.id === activeId)
  const isOpen = open && options.length > 0

  const waiting =
    typed.length >= MIN_TERM &&
    (normalizeTerm(term) !== debounced || suggestions.isFetching)

  function choose(option: (typeof options)[number] | undefined) {
    setOpen(false)
    setActiveId(undefined)
    if (!option) {
      if (typed) {
        add(typed)
        void navigate(paths.products({ search: typed }))
      }
      return
    }
    if (option.kind === "clear-recent") {
      clear()
      return
    }
    if (option.remember) add(option.remember)
    if (option.kind === "recent" || option.kind === "correction")
      setTerm(option.label)
    if (option.href) void navigate(option.href)
  }

  function move(delta: 1 | -1) {
    if (options.length === 0) return
    setOpen(true)
    const i = active ? options.indexOf(active) : -1
    const next = (i + delta + options.length) % options.length
    // From "nothing active", ArrowUp goes to the LAST option, ArrowDown to the first.
    setActiveId(
      options[i === -1 && delta === -1 ? options.length - 1 : next]?.id
    )
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        move(1)
        break
      case "ArrowUp":
        event.preventDefault()
        move(-1)
        break
      case "Home":
      case "End":
        if (isOpen && active) {
          event.preventDefault()
          setActiveId(
            options[event.key === "Home" ? 0 : options.length - 1]?.id
          )
        }
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

  const status =
    typed.length < MIN_TERM
      ? ""
      : waiting
        ? "Searching"
        : suggestions.isError
          ? "Suggestions are unavailable"
          : `${options.length} suggestion${options.length === 1 ? "" : "s"} available`

  return (
    <form
      ref={formRef}
      role="search"
      className="relative"
      onSubmit={(e) => {
        e.preventDefault()
        choose(active)
      }}
    >
      <label htmlFor={`${id}-input`} className="sr-only">
        Search products
      </label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-activedescendant={
          isOpen && active ? `${listId}-opt-${active.id}` : undefined
        }
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        placeholder="Search products (press /)"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setOpen(true)
          setActiveId(undefined)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-56 rounded border p-1 text-sm"
      />
      {/* Polite live region: screen readers hear the count (and which option is active via the input). */}
      <div role="status" aria-live="polite" className="sr-only">
        {isOpen ? status : ""}
      </div>
      <div
        hidden={!isOpen}
        aria-busy={waiting}
        className="absolute top-full right-0 left-0 z-20 mt-1 max-h-96 min-w-72 overflow-y-auto rounded border bg-background p-1 text-sm shadow"
      >
        {isOpen && suggestions.isError && typed.length >= MIN_TERM && (
          <p role="alert" className="px-2 py-1 text-destructive">
            {toApiError(suggestions.error).message}
          </p>
        )}
        <SuggestionList
          listId={listId}
          groups={groups}
          activeId={active?.id}
          query={typed}
          onChoose={(oid) => choose(options.find((o) => o.id === oid))}
          onHover={setActiveId}
        />
      </div>
    </form>
  )
}
