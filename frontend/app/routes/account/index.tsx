import { PlaceholderPage } from "@/components/common/PlaceholderPage"
import { pageTitle } from "@/lib/pageTitle"

export default function AccountIndexRoute() {
  return <PlaceholderPage title="Account overview" builtIn="7" />
}

export function meta() {
  return [{ title: pageTitle("Account") }]
}
