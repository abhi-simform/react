import { DevThrowButton } from "@/components/common/DevThrowButton"
import { ProfileForm } from "@/features/account"
import { noindexMeta } from "@/lib/seo"
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
  return noindexMeta("Profile")
}

export const handle = { breadcrumb: "Profile" } satisfies RouteHandle
