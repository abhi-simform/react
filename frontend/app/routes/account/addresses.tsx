import { AddressBook } from "@/features/account"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountAddressesRoute() {
  return <AddressBook />
}

export function meta() {
  return noindexMeta("Addresses")
}

export const handle = { breadcrumb: "Addresses" } satisfies RouteHandle
