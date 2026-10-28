import { paths } from "@/lib/paths"

import type { Suggestions } from "./schemas"

export type OptionKind =
  | "product"
  | "category"
  | "brand"
  | "recent"
  | "correction"
  | "search"
  | "clear-recent"

export type SearchOption = {
  id: string
  kind: OptionKind
  label: string
  /** Where choosing it goes (absent for the "clear recent searches" action). */
  href?: string
  /** Remember the TYPED term (or this label) as a recent search when chosen. */
  remember?: string
  image?: string | null
  hint?: string
}
export type OptionGroup = { id: string; label: string; options: SearchOption[] }

/**
 * The listbox content as plain data (testable, no React): groups in a fixed order, each option with
 * a stable id and a destination. The flat `options` list is what the arrow keys walk through, so
 * "active option" is just an index into it.
 */
export function buildGroups(input: {
  term: string
  data?: Suggestions
  recent: readonly string[]
}): OptionGroup[] {
  const { term, data, recent } = input
  const groups: OptionGroup[] = []

  if (term.length === 0) {
    if (recent.length) {
      groups.push({
        id: "recent",
        label: "Recent searches",
        options: [
          ...recent.map<SearchOption>((r) => ({
            id: `recent:${r}`,
            kind: "recent",
            label: r,
            href: paths.products({ search: r }),
            remember: r,
          })),
          {
            id: "clear-recent",
            kind: "clear-recent",
            label: "Clear recent searches",
          },
        ],
      })
    }
    return groups
  }

  if (data?.correction) {
    groups.push({
      id: "correction",
      label: "Did you mean",
      options: [
        {
          id: `correction:${data.correction}`,
          kind: "correction",
          label: data.correction,
          href: paths.products({ search: data.correction }),
          remember: data.correction,
        },
      ],
    })
  }
  if (data?.products.length)
    groups.push({
      id: "products",
      label: "Products",
      options: data.products.map((p) => ({
        id: `product:${p.id}`,
        kind: "product",
        label: p.name,
        hint: p.category?.name ?? p.brand,
        image: p.image,
        href: paths.product(p.slug),
      })),
    })
  if (data?.categories.length)
    groups.push({
      id: "categories",
      label: "Categories",
      options: data.categories.map((c) => ({
        id: `category:${c.id}`,
        kind: "category",
        label: c.name,
        href: paths.category(c.slug),
      })),
    })
  if (data?.brands.length)
    groups.push({
      id: "brands",
      label: "Brands",
      options: data.brands.map((b) => ({
        id: `brand:${b.name}`,
        kind: "brand",
        label: b.name,
        hint: `${b.count} products`,
        href: paths.products({ brand: b.name }),
      })),
    })
  // The fallback is ALWAYS there (even while loading or with no matches): Enter on it is what a
  // plain search form would do.
  groups.push({
    id: "search",
    label: "Search",
    options: [
      {
        id: "search",
        kind: "search",
        label: `Search for "${term}"`,
        href: paths.products({ search: term }),
        remember: term,
      },
    ],
  })
  return groups
}

export const flatten = (groups: readonly OptionGroup[]): SearchOption[] =>
  groups.flatMap((g) => g.options)
