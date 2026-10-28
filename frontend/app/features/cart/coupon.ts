import { abortable } from "@/lib/async"

import type { CouponRule } from "./types"

/** Typed outcomes of checking a coupon: every case has its own message (7.6). */
export type CouponOutcome =
  | { status: "valid"; code: string; rule: CouponRule; label: string }
  | { status: "expired"; code: string; expiredOn: string }
  | { status: "min_order_not_met"; code: string; minOrder: number }
  | { status: "unknown"; code: string }

type Entry = { rule: CouponRule; label: string; expiresOn?: string }

// STUB until the coupon API (B4, Stage 11). Money in paise.
const COUPONS: Record<string, Entry> = {
  SAVE10: {
    rule: { type: "percent", value: 10, maxDiscount: 20_000, minOrder: 50_000 },
    label: "10% off, up to Rs 200 (orders from Rs 500)",
  },
  FLAT100: {
    rule: { type: "flat", value: 10_000, minOrder: 200_000 },
    label: "Rs 100 off (orders from Rs 2,000)",
  },
  OLD50: {
    rule: { type: "percent", value: 50 },
    label: "50% off",
    expiresOn: "2026-09-30",
  },
}

/** Pretends to call the server: 400 ms latency, cancellable. The server will be the authority. */
export async function validateCoupon(
  code: string,
  { subtotal, signal }: { subtotal: number; signal?: AbortSignal }
): Promise<CouponOutcome> {
  await abortable(400, signal)
  const entry = COUPONS[code]
  if (!entry) return { status: "unknown", code }
  if (entry.expiresOn && new Date(entry.expiresOn) < new Date())
    return { status: "expired", code, expiredOn: entry.expiresOn }
  const { minOrder } = entry.rule
  if (minOrder !== undefined && subtotal < minOrder)
    return { status: "min_order_not_met", code, minOrder }
  return { status: "valid", code, rule: entry.rule, label: entry.label }
}
