import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { Link } from "react-router"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { RailErrorBoundary } from "@/components/common/RailErrorBoundary"
import { ProductGridSkeleton } from "@/components/common/Skeletons"
import { paths } from "@/lib/paths"
import { toAsyncState } from "@/lib/queryState"

import { toProductCardVM } from "../mappers"
import { productQueries } from "../queries"
import type { ProductQuery } from "../types"
import { ProductGrid } from "./ProductGrid"

type Rail = {
  id: string
  title: string
  sort: NonNullable<ProductQuery["sort"]>
  category?: string
  /** Rendered with `useSuspenseQuery` + `<Suspense>` instead of the `isPending` branches. */
  suspense?: boolean
}

// Eight independent rails = eight parallel queries (9.9). Each has its own loading skeleton and
// its own error boundary, so one failure (or one slow request) never blocks the others.
const RAILS: readonly Rail[] = [
  { id: "new", title: "New arrivals", sort: "newest" },
  { id: "top", title: "Top rated", sort: "rating" },
  {
    id: "popular",
    title: "Popular right now",
    sort: "popularity",
    suspense: true,
  },
  {
    id: "electronics",
    title: "Electronics",
    sort: "popularity",
    category: "electronics",
  },
  { id: "fashion", title: "Fashion", sort: "popularity", category: "fashion" },
  {
    id: "home",
    title: "Home and kitchen",
    sort: "popularity",
    category: "home-kitchen",
  },
  {
    id: "beauty",
    title: "Beauty",
    sort: "rating",
    category: "beauty-personal-care",
  },
  { id: "books", title: "Books", sort: "rating", category: "books" },
]

function RailShell({
  rail,
  children,
}: {
  rail: Rail
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={`rail-${rail.id}`}
      className="flex flex-col gap-2"
    >
      <div className="flex items-baseline justify-between">
        <h2 id={`rail-${rail.id}`} className="text-lg font-medium">
          {rail.title}
        </h2>
        <Link
          className="text-sm underline"
          to={paths.products({ sort: rail.sort, category: rail.category })}
        >
          See all
        </Link>
      </div>
      {children}
    </section>
  )
}

/** The classic version: branch on `status` (through `AsyncView`). The error stays inside this rail. */
function ProductRail({ rail, forceFail }: { rail: Rail; forceFail: boolean }) {
  const state = toAsyncState(useQuery(productQueries.rail(rail, forceFail)))
  return (
    <RailShell rail={rail}>
      <AsyncView
        state={state}
        loading={<ProductGridSkeleton count={5} />}
        empty={(items) =>
          items.length === 0 && <EmptyState title="Nothing here yet" />
        }
      >
        {(items) => <ProductGrid products={items.map(toProductCardVM)} />}
      </AsyncView>
    </RailShell>
  )
}

/**
 * The Suspense version (9.9): no `status` branches at all. `data` is always defined; "loading"
 * is the nearest `<Suspense fallback>` and "error" is the nearest error boundary. Fewer lines in
 * the component, but the states moved to the CALLER and a failed rail needs the boundary's reset.
 */
function SuspenseRailBody({
  rail,
  forceFail,
}: {
  rail: Rail
  forceFail: boolean
}) {
  const { data } = useSuspenseQuery(productQueries.rail(rail, forceFail))
  return data.length === 0 ? (
    <EmptyState title="Nothing here yet" />
  ) : (
    <ProductGrid products={data.map(toProductCardVM)} />
  )
}

function SuspenseRail({ rail, forceFail }: { rail: Rail; forceFail: boolean }) {
  return (
    <RailShell rail={rail}>
      <RailErrorBoundary label={rail.title}>
        <Suspense fallback={<ProductGridSkeleton count={5} />}>
          <SuspenseRailBody rail={rail} forceFail={forceFail} />
        </Suspense>
      </RailErrorBoundary>
    </RailShell>
  )
}

/** Dev only: `/?failRail=top` makes that rail fail with a fake 500 after 400 ms. */
export function HomeRails({ failRail }: { failRail?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      {RAILS.map((rail) => {
        const forceFail = import.meta.env.DEV && failRail === rail.id
        return rail.suspense ? (
          <SuspenseRail key={rail.id} rail={rail} forceFail={forceFail} />
        ) : (
          <ProductRail key={rail.id} rail={rail} forceFail={forceFail} />
        )
      })}
    </div>
  )
}
