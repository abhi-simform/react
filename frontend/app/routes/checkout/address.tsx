import { AddressStep, StepNav } from "@/features/checkout"
import { pageTitle } from "@/lib/pageTitle"
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
  return [{ title: pageTitle("Checkout: address") }]
}

export const handle = { breadcrumb: "Address" } satisfies RouteHandle
