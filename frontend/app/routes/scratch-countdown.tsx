// Throwaway (4.6): countdown experiments.
import { useState } from "react"

import { FlashSaleStrip } from "@/features/deals/components/FlashSaleStrip"
import { CountdownLab } from "@/scratch/countdown/CountdownLab"

export default function ScratchCountdown() {
  // A strip that ends 6 seconds after the page opens: watch it flip to "Deal ended".
  const [soon] = useState(() => Date.now() + 6000)
  return (
    <div className="grid gap-4 p-4">
      <CountdownLab />
      <FlashSaleStrip endsAt={soon} />
    </div>
  )
}
