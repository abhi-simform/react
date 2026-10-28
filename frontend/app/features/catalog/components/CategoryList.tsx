import { Link, useLocation } from "react-router"

import { paths } from "@/lib/paths"
import { cn } from "@/lib/utils"

import { useCategoryTree } from "../hooks/useCategories"
import type { CategoryNode } from "../types"

const hasSlug = (node: CategoryNode, slug?: string): boolean =>
  node.slug === slug || node.children.some((c) => hasSlug(c, slug))

/** Category links keep the other filters (not the page) when you switch category. */
export function CategoryList({ activeSlug }: { activeSlug?: string }) {
  const tree = useCategoryTree()
  const { search } = useLocation()
  const carry = new URLSearchParams(search)
  carry.delete("page")
  const qs = carry.size > 0 ? `?${carry.toString()}` : ""

  if (tree.status === "loading" || tree.status === "idle")
    return <p role="status">Loading categories...</p>
  if (tree.status === "error")
    return (
      <p role="alert">
        Could not load categories.{" "}
        <button type="button" className="underline" onClick={tree.reload}>
          Retry
        </button>
      </p>
    )

  const link = (node: CategoryNode, nested: boolean) => (
    <Link
      to={paths.category(node.slug) + qs}
      aria-current={node.slug === activeSlug ? "page" : undefined}
      className={cn(
        "flex justify-between rounded px-1 py-0.5",
        nested && "pl-4",
        node.slug === activeSlug && "bg-neutral-200 font-medium"
      )}
    >
      <span>{node.name}</span>
      <span className="text-neutral-500">{node.productCount}</span>
    </Link>
  )

  return (
    <nav aria-label="Categories" className="text-sm">
      <h2 className="mb-1 font-medium">Category</h2>
      <ul>
        <li>
          <Link
            to={paths.products() + qs}
            aria-current={activeSlug === undefined ? "page" : undefined}
            className="block rounded px-1 py-0.5"
          >
            All products
          </Link>
        </li>
        {tree.data.map((root) => (
          <li key={root.id}>
            {link(root, false)}
            {/* Only the branch you are in is expanded. */}
            {hasSlug(root, activeSlug) && (
              <ul>
                {root.children.map((child) => (
                  <li key={child.id}>{link(child, true)}</li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  )
}
