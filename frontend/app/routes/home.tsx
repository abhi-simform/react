import { useSearchParams } from "react-router"

import { HealthBadge } from "@/components/common/HealthBadge"
import { HomeRails } from "@/features/catalog"
import {
  ForYouRail,
  RecentlyViewedRail,
  TrendingRail,
} from "@/features/recommendations"
import { FlashSaleStrip } from "@/features/deals"
import { pageTitle } from "@/lib/pageTitle"

export default function Home() {
  const [searchParams] = useSearchParams()
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-medium">ShopSphere</h1>
      <HealthBadge />
      <FlashSaleStrip />
      <ForYouRail />
      <TrendingRail />
      <RecentlyViewedRail />
      <HomeRails failRail={searchParams.get("failRail")} />
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
