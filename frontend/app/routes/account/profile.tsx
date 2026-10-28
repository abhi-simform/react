import { DevThrowButton } from "@/components/common/DevThrowButton"
import { PlaceholderPage } from "@/components/common/PlaceholderPage"

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
