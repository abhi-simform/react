import { Button } from "@/components/ui/button"

import { useResendVerification } from "../useResendVerification"

export function ResendVerificationButton({
  startCooling = false,
}: {
  startCooling?: boolean
}) {
  const { resend, pending, secondsLeft, canResend } = useResendVerification({
    startCooling,
  })
  return (
    <Button
      type="button"
      variant="outline"
      disabled={!canResend}
      onClick={resend}
    >
      {pending
        ? "Sending..."
        : secondsLeft > 0
          ? `Resend email (${secondsLeft}s)`
          : "Resend email"}
    </Button>
  )
}
