import { DevThrowButton } from "@/components/common/DevThrowButton"
import { ProfileForm } from "@/features/account"
import { pageTitle } from "@/lib/pageTitle"
import type { RouteHandle } from "@/types/route-handle"

export default function AccountProfileRoute() {
  return (
    <>
      <ProfileForm />
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
