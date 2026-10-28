import { useLocation } from "react-router"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { googleSignInUrl } from "../auth.api"
import { getReturnTo } from "../returnTo"

/**
 * A plain link, on purpose: Google sign-in is a full-page navigation to the API (which then
 * redirects to Google). The only thing we hand over is where to come back to.
 */
export function GoogleButton({
  label = "Continue with Google",
}: {
  label?: string
}) {
  const location = useLocation()
  return (
    <a
      href={googleSignInUrl(getReturnTo(location))}
      className={cn(buttonVariants({ variant: "outline" }), "w-full")}
    >
      {label}
    </a>
  )
}
