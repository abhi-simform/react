import { queryOptions } from "@tanstack/react-query"

import { STALE } from "@/lib/query-client"
import { addressKeys, profileKeys } from "@/lib/queryKeys"

import { getAddresses } from "./addresses.api"
import { getProfile } from "./profile.api"

export const addressQueries = {
  list: () =>
    queryOptions({
      queryKey: addressKeys.list(),
      queryFn: ({ signal }) => getAddresses(signal),
      staleTime: STALE.personal,
    }),
}

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: profileKeys.me(),
      queryFn: ({ signal }) => getProfile(signal),
      staleTime: STALE.personal,
    }),
}
