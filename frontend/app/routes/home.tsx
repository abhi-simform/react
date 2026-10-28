import { HealthBadge } from "@/components/common/HealthBadge"
import { RecentlyViewedRail } from "@/features/product"
import { FlashSaleStrip } from "@/features/deals"
import { pageTitle } from "@/lib/pageTitle"

export default function Home() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-medium">ShopSphere</h1>
      <HealthBadge />
      <FlashSaleStrip />
      <RecentlyViewedRail />
    </div>
  )
}

export function meta() {
  return [
    { title: pageTitle() },
    {
      name: "description",
      content: "Shop electronics, fashion, home and more",
    },
  ]
}
