import { useRef, useState } from "react"
import { Link } from "react-router"

import { useCategoryTree } from "@/features/catalog"
import { useOnClickOutside } from "@/hooks/useOnClickOutside"
import { paths } from "@/lib/paths"

/** Desktop navigation: a disclosure panel with the real category tree (B1). */
export function MegaMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useOnClickOutside(ref, () => setOpen(false))
  const tree = useCategoryTree()

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
        <div
          id="mega-menu-panel"
          data-testid="mega-menu"
          className="absolute top-full left-0 z-20 mt-1 w-[32rem] rounded border bg-white p-3 text-sm shadow"
        >
          {tree.status === "success" ? (
            <ul className="grid grid-cols-2 gap-4">
              {tree.data.map((root) => (
                <li key={root.id}>
                  <Link
                    to={paths.category(root.slug)}
                    onClick={() => setOpen(false)}
                    className="font-medium"
                  >
                    {root.name}
                  </Link>
                  <ul>
                    {root.children.map((c) => (
                      <li key={c.id}>
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
                </li>
              ))}
            </ul>
          ) : tree.status === "error" ? (
            <p role="alert">Could not load categories.</p>
          ) : (
            <p role="status">Loading categories...</p>
          )}
        </div>
      )}
    </div>
  )
}
