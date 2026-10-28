import { AddressStep, StepNav } from "@/features/checkout"
import { noindexMeta } from "@/lib/seo"
import type { RouteHandle } from "@/types/route-handle"

export default function CheckoutAddressRoute() {
  return (
    <>
      <AddressStep />
      <StepNav />
    </>
  )
}

export function meta() {
  return noindexMeta("Checkout: address")
}

export const handle = { breadcrumb: "Address" } satisfies RouteHandle
