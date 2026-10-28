import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { homeKeys } from "@/lib/queryKeys"

import { getBanners } from "./home.api"

export const homeQueries = {
  banners: (placement: "hero" | "strip") =>
    queryOptions({
      queryKey: homeKeys.banners(placement),
      queryFn: ({ signal }) => getBanners(placement, signal),
      staleTime: STALE.catalog,
    }),
}
