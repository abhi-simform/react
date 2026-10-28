import { useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/lib/paths"

/** Fake order (real one: Stage 11). `replace` swaps the review step for the success page. */
export function PlaceOrderButton() {
  const navigate = useNavigate()
  return (
    <Button
      onClick={() =>
        navigate(paths.orderSuccess(`fake-${Date.now()}`), { replace: true })
      }
    >
      Place order (fake)
    </Button>
  )
}
