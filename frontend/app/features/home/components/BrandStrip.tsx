import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { brandQueries } from "@/features/catalog"
import { toApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

const SHOWN = 16

/** Shop by brand: the biggest brands as links to the filtered listing. */
export function BrandStrip() {
  const q = useQuery(brandQueries.list())
  const brands = [...(q.data ?? [])]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, SHOWN)
  return (
    <section aria-labelledby="brand-strip">
      <h2 id="brand-strip" className="mb-2 text-lg font-medium">
        Shop by brand
      </h2>
      {q.isPending ? (
        <p role="status" aria-busy="true" className="text-sm">
          Loading brands...
        </p>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-red-700">
          Could not load brands ({toApiError(q.error).message}).{" "}
          <button className="underline" onClick={() => void q.refetch()}>
            Retry
          </button>
        </p>
      ) : brands.length === 0 ? null : (
        <ul className="flex flex-wrap gap-2">
          {brands.map((b) => (
            <li key={b.name}>
              <Link
                to={paths.products({ brand: b.name })}
                className="rounded-full border px-3 py-1 text-sm hover:bg-neutral-50"
              >
                {b.name}{" "}
                <span className="text-xs text-neutral-500">({b.count})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
