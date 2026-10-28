import { Link } from "react-router"

import { AsyncView } from "@/components/common/AsyncView"
import { EmptyState } from "@/components/common/EmptyState"
import { ProductGridSkeleton } from "@/components/common/Skeletons"
import { useAsyncResource } from "@/hooks/useAsyncResource"
import { ApiError } from "@/lib/api/errors"
import { paths } from "@/lib/paths"

import { getProducts } from "../api"
import { ProductGrid } from "./ProductGrid"

type Rail = {
  id: string
  title: string
  sort: "newest" | "rating" | "popularity"
}

const RAILS: readonly Rail[] = [
  { id: "new", title: "New arrivals", sort: "newest" },
  { id: "top", title: "Top rated", sort: "rating" },
  { id: "popular", title: "Popular right now", sort: "popularity" },
]

/**
 * One rail = one section = its OWN request and its OWN AsyncView, so a failing rail
 * shows an inline error with a retry while the others render (the `Promise.allSettled`
 * idea from 1.6, but per component: there is no "all or nothing" anywhere).
 * Dev only: `/?failRail=top` makes that rail fail with a fake 500 after 400 ms.
 */
function ProductRail({ rail, forceFail }: { rail: Rail; forceFail: boolean }) {
  const state = useAsyncResource(
    `rail:${rail.id}:${forceFail}`,
    async (signal) => {
      if (forceFail) {
        // A believable 500 (retryable), not a 404.
        await new Promise((r) => setTimeout(r, 400))
        throw new ApiError({
          status: 500,
          code: "INTERNAL_ERROR",
          message: "Demo failure",
        })
      }
      const page = await getProducts({ limit: 5, sort: rail.sort }, signal)
      return page.items
    }
  )
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
          to={paths.products({ sort: rail.sort })}
        >
          See all
        </Link>
      </div>
      <AsyncView
        state={state}
        loading={<ProductGridSkeleton count={5} />}
        empty={(items) =>
          items.length === 0 && <EmptyState title="Nothing here yet" />
        }
      >
        {(items) => <ProductGrid products={items} />}
      </AsyncView>
    </section>
  )
}

export function HomeRails({ failRail }: { failRail?: string | null }) {
  return (
    <div className="flex flex-col gap-6">
      {RAILS.map((rail) => (
        <ProductRail
          key={rail.id}
          rail={rail}
          forceFail={import.meta.env.DEV && failRail === rail.id}
        />
      ))}
    </div>
  )
}
