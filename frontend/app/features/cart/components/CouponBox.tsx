import { zodResolver } from "@hookform/resolvers/zod"
import { useRef, useState } from "react"
import { useForm } from "react-hook-form"

import { FormField } from "@/components/form/FormField"
import { Button } from "@/components/ui/button"
import { isAbortError } from "@/lib/async"
import { formatCurrency } from "@/lib/format"

import { validateCoupon, type CouponOutcome } from "../coupon"
import { couponSchema, type CouponValues } from "../schemas"
import { computeTotals } from "../totals"
import type { CartLine } from "../types"

/** One distinct, human sentence per outcome (7.6). Money is paise. */
export function describeCoupon(
  outcome: CouponOutcome,
  lines: readonly CartLine[]
): string {
  switch (outcome.status) {
    case "valid": {
      const saved = computeTotals(lines, { coupon: outcome.rule }).discount
      return `${outcome.code} applied: ${outcome.label}. You save ${formatCurrency(saved)} on this cart.`
    }
    case "expired":
      return `${outcome.code} expired on ${outcome.expiredOn}.`
    case "min_order_not_met": {
      const subtotal = computeTotals(lines).subtotal
      return `${outcome.code} needs a cart of at least ${formatCurrency(outcome.minOrder)}. Add ${formatCurrency(outcome.minOrder - subtotal)} more to use it.`
    }
    case "unknown":
      return `We do not recognise "${outcome.code}". Check the spelling.`
  }
}

/**
 * Coupon field (7.6). The schema normalises the code (trim + upper-case); the advisory
 * check is the stub `validateCoupon`. A new submit aborts the previous check, and the
 * outcome is stored with the code it answers so an old answer cannot show for a new code.
 */
export function CouponBox({ lines }: { lines: readonly CartLine[] }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(couponSchema) })
  const [outcome, setOutcome] = useState<CouponOutcome>()
  const controller = useRef<AbortController | null>(null)

  async function onSubmit({ code }: CouponValues) {
    controller.current?.abort()
    const mine = new AbortController()
    controller.current = mine
    try {
      const result = await validateCoupon(code, {
        subtotal: computeTotals(lines).subtotal,
        signal: mine.signal,
      })
      if (!mine.signal.aborted) setOutcome(result)
    } catch (err) {
      if (!isAbortError(err)) throw err
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(onSubmit)(e)}
      noValidate
      className="flex flex-col gap-2"
    >
      <FormField label="Coupon code" error={errors.code?.message}>
        {(c) => (
          <div className="flex gap-2">
            <input
              className="rounded border p-1"
              autoComplete="off"
              {...c}
              {...register("code", { onChange: () => setOutcome(undefined) })}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Checking..." : "Apply"}
            </Button>
          </div>
        )}
      </FormField>
      {outcome && (
        <p
          role="status"
          data-outcome={outcome.status}
          className={
            outcome.status === "valid"
              ? "text-sm text-green-800"
              : "text-sm text-red-700"
          }
        >
          {describeCoupon(outcome, lines)}
        </p>
      )}
    </form>
  )
}
