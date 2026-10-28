import { HealthBadge } from "@/components/common/HealthBadge"
import { FlashSaleStrip } from "@/features/deals/components/FlashSaleStrip"

export default function Home() {
  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-medium">ShopSphere</h1>
      <HealthBadge />
      <FlashSaleStrip />
    </div>
  )
}
