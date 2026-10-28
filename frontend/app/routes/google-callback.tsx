import { GoogleCallback } from "@/features/auth"
import { pageTitle } from "@/lib/pageTitle"

export default function GoogleCallbackRoute() {
  return <GoogleCallback />
}

export function meta() {
  return [
    { title: pageTitle("Signing you in") },
    // The URL may carry a one-time token: never leak it through the Referer header.
    { name: "robots", content: "noindex, nofollow" },
    { name: "referrer", content: "no-referrer" },
  ]
}
