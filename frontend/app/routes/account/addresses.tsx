import { AddressBook } from "@/features/account"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountAddressesRoute() {
  return <AddressBook />
}

export function meta() {
  return [{ title: pageTitle("Addresses") }]
}

export const handle = { breadcrumb: "Addresses" } satisfies RouteHandle
