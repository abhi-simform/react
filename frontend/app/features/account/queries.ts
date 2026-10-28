import { queryOptions } from "@tanstack/react-query"

import { addressKeys, profileKeys } from "@/lib/queryKeys"

import { getAddresses } from "./addresses.api"
import { getProfile } from "./profile.api"

export const addressQueries = {
  list: () =>
    queryOptions({
      queryKey: addressKeys.list(),
      queryFn: ({ signal }) => getAddresses(signal),
    }),
}

export const profileQueries = {
  me: () =>
    queryOptions({
      queryKey: profileKeys.me(),
      queryFn: ({ signal }) => getProfile(signal),
    }),
}
