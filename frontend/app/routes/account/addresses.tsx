import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountAddressesRoute() {
  return <PlaceholderPage title="Addresses" builtIn="6 and 7" />
}

export function meta() {
  return [{ title: pageTitle("Addresses") }]
}

export const handle = { breadcrumb: "Addresses" } satisfies RouteHandle
