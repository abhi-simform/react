import { Link, useMatches } from "react-router"

import { getBreadcrumb } from "@/types/route-handle"
import { paths } from "@/lib/paths"

export type Crumb = { label: string; to?: string }

/**
 * Home > ...route handles... > ...data-driven `trail`.
 * Static crumbs come from the matched routes' `handle.breadcrumb`; pages whose
 * crumbs depend on loaded data (category, product) pass them as `trail`.
 * The last crumb is the current page: plain text with `aria-current="page"`.
 */
export function Breadcrumbs({ trail = [] }: { trail?: Crumb[] }) {
  const matches = useMatches()
  const fromHandles = matches.flatMap((match) => {
    const label = getBreadcrumb(match.handle)
    return label ? [{ label, to: match.pathname }] : []
  })
  const crumbs: Crumb[] = [
    { label: "Home", to: paths.home() },
    ...fromHandles,
    ...trail,
  ]

  return (
    <nav aria-label="Breadcrumb" className="px-4 pt-3 text-sm">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-1">
              {isLast || !crumb.to ? (
                <span aria-current={isLast ? "page" : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="underline">
                  {crumb.label}
                </Link>
              )}
              {!isLast && <span aria-hidden>/</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
