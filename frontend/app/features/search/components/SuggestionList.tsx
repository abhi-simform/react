import { cn } from "@/lib/utils"

import type { OptionGroup } from "../options"
import { Highlight } from "./Highlight"

type Props = {
  listId: string
  groups: OptionGroup[]
  activeId: string | undefined
  /** Text typed so far (for match highlighting). */
  query: string
  onChoose: (optionId: string) => void
  onHover: (optionId: string) => void
}

/**
 * The listbox: groups (`role="group"` labelled by their heading) of options. Options get stable
 * ids so `aria-activedescendant` on the input can point at the active one while DOM focus stays in
 * the input. `onMouseDown` prevents the input from blurring (which would close the list before
 * `click` fires, the classic combobox bug); `click` also serves touch.
 */
export function SuggestionList({
  listId,
  groups,
  activeId,
  query,
  onChoose,
  onHover,
}: Props) {
  return (
    <ul id={listId} role="listbox" aria-label="Search suggestions">
      {groups.map((g) => (
        <li key={g.id} role="presentation">
          <ul role="group" aria-labelledby={`${listId}-${g.id}`}>
            <li
              role="presentation"
              id={`${listId}-${g.id}`}
              className="px-2 pt-2 text-xs font-medium text-neutral-500 uppercase"
            >
              {g.label}
            </li>
            {g.options.map((o) => (
              // Combobox pattern: DOM focus stays in the INPUT (arrow keys + Enter, handled in
              // SearchBox, drive `aria-activedescendant`); the click is for pointer and touch.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={o.id}
                id={`${listId}-opt-${o.id}`}
                role="option"
                aria-selected={o.id === activeId}
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => onHover(o.id)}
                onClick={() => onChoose(o.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded px-2 py-1",
                  o.id === activeId && "bg-neutral-200",
                  o.kind === "clear-recent" && "text-neutral-600 underline"
                )}
              >
                {o.kind === "product" && (
                  // Decorative: the name next to it says what it is.
                  <img
                    src={o.image ?? undefined}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    className="size-8 shrink-0 rounded bg-neutral-100 object-cover"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {o.kind === "product" ||
                  o.kind === "category" ||
                  o.kind === "brand" ? (
                    <Highlight text={o.label} query={query} />
                  ) : (
                    o.label
                  )}
                </span>
                {o.hint && (
                  <span className="shrink-0 text-xs text-neutral-500">
                    {o.hint}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}
