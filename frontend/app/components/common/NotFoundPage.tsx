import { Form, Link } from "react-router"

import { useCategoryTree } from "@/features/catalog"
import { paths } from "@/lib/paths"

/** A 404 with a way forward: search, popular categories, home. */
export function NotFoundPage({
  title = "Page not found",
  message = "We could not find what you were looking for. The link may be old or mistyped.",
}: {
  title?: string
  message?: string
}) {
  const tree = useCategoryTree()
  const popular =
    tree.status === "success"
      ? tree.data.flatMap((root) => root.children).slice(0, 8)
      : []
  return (
    <div className="mx-auto max-w-xl p-4">
      <h1 className="text-xl font-medium">404: {title}</h1>
      <p className="my-2 text-sm">{message}</p>
      <Form
        method="get"
        action={paths.products()}
        role="search"
        className="my-3 flex gap-2"
      >
        <label className="sr-only" htmlFor="not-found-search">
          Search products
        </label>
        <input
          id="not-found-search"
          name="search"
          type="search"
          placeholder="Search products"
          className="flex-1 rounded border p-1 text-sm"
        />
        <button type="submit" className="rounded border px-3 text-sm">
          Search
        </button>
      </Form>
      {popular.length > 0 && (
        <nav aria-label="Popular categories" className="mb-3 text-sm">
          <h2 className="font-medium">Popular categories</h2>
          <ul className="flex flex-wrap gap-3">
            {popular.map((c) => (
              <li key={c.id}>
                <Link className="underline" to={paths.category(c.slug)}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <Link to={paths.home()} className="underline">
        Back to the home page
      </Link>
    </div>
  )
}
