import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { categoryQueries } from "@/features/catalog"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

/** Top-level categories with their product counts (the tree is already cached by the header menu). */
export function TopCategories() {
  const q = useQuery(categoryQueries.tree())
  return (
    <section aria-labelledby="top-categories">
      <h2 id="top-categories" className="mb-2 text-lg font-medium">
        Top categories
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading categories...
        </p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load categories ({toApiError(q.error).message}).{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Retry
          </button>
        </p>
      ) : q.data.length === 0 ? null : (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {q.data.map((c) => (
            <li key={c.id}>
              <Link
                to={paths.category(c.slug)}
                className="flex h-full flex-col rounded-lg border p-3 hover:bg-neutral-50"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-neutral-600">
                  {c.productCount} products
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
