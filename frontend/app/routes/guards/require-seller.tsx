import { RequireRole } from "@/features/auth"

export default function RequireSeller() {
  return <RequireRole role="seller" />
}
