import { DevThrowButton } from "@/components/common/DevThrowButton"
import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountProfileRoute() {
  return (
    <>
      <PlaceholderPage title="Profile" builtIn="7" />
      <div className="p-4">
        <DevThrowButton />
      </div>
    </>
  )
}

export function meta() {
  return [{ title: pageTitle("Profile") }]
}

export const handle = { breadcrumb: "Profile" } satisfies RouteHandle
