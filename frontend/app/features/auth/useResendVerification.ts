import { useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { useCountdown } from "@/hooks/useCountdown"
import { ApiError } from "@/lib/api/errors"

import { resendVerification } from "./auth.api"

const COOLDOWN_MS = 60_000

/**
 * "Resend verification email" with a 60 s cooldown (the server enforces the same rule, so a
 * second tab or a reload cannot bypass it: its 429 carries `retryAfterSeconds`, which this
 * hook turns back into a countdown). `useCountdown` computes the time left from the clock, so
 * a throttled background tab shows the right number when you come back.
 */
export function useResendVerification({ startCooling = false } = {}) {
  const [readyAt, setReadyAt] = useState(() =>
    startCooling ? Date.now() + COOLDOWN_MS : 0
  )
  const countdown = useCountdown(readyAt)
  const mutation = useMutation({
    mutationFn: resendVerification,
    meta: { silent: true },
    onSuccess: () => {
      setReadyAt(Date.now() + COOLDOWN_MS)
      toast.success("Verification email sent. Check your inbox.")
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "RESEND_COOLDOWN") {
        const d = error.details as { retryAfterSeconds?: number } | undefined
        setReadyAt(Date.now() + (d?.retryAfterSeconds ?? 60) * 1000)
      } else if (
        error instanceof ApiError &&
        error.code === "ALREADY_VERIFIED"
      ) {
        toast.info("Your email is already verified.")
      } else {
        toast.error("Could not send the email. Try again in a moment.")
      }
    },
  })
  const secondsLeft = Math.ceil(countdown.remainingMs / 1000)
  return {
    resend: () => mutation.mutate(),
    pending: mutation.isPending,
    secondsLeft,
    canResend: !mutation.isPending && secondsLeft === 0,
  }
}
