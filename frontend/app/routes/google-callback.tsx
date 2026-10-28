import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"

export default function GoogleCallbackRoute() {
  return <PlaceholderPage title="Signing you in with Google" builtIn="10" />
}

export function meta() {
  return [{ title: pageTitle("Signing you in") }]
}
