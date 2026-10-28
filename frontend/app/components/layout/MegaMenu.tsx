import { useRef, useState } from "react"
import { Link } from "react-router"

import { useOnClickOutside } from "@/hooks/useOnClickOutside"
import { paths } from "@/lib/paths"

import { NAV_CATEGORIES } from "./categories"

/** Desktop navigation: a disclosure panel with all categories at once. */
export function MegaMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, () => setOpen(false))

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mega-menu-panel"
        onClick={() => setOpen((o) => !o)}
        className="rounded border px-2 py-1 text-sm"
      >
        Categories
      </button>
      {open && (
        <ul
          id="mega-menu-panel"
          data-testid="mega-menu"
          className="absolute top-full left-0 z-20 mt-1 grid w-96 grid-cols-2 gap-1 rounded border bg-white p-3 shadow"
        >
          {NAV_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link
                to={paths.category(c.slug)}
                onClick={() => setOpen(false)}
                className="block rounded p-1 hover:bg-neutral-100"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
