import { env } from "../../config/env.js"
import { logger } from "../../config/logger.js"
import { registerJob } from "../../jobs/queue.js"
import { Order } from "./order.model.js"
import { cancelOrder } from "./order.service.js"

const REASON = "Payment was not completed in time"

/**
 * Cancels online orders that sat in `pending_payment` too long, which releases their reserved
 * stock, deal claim and coupon use (the same transaction a customer cancel runs). Safe to run
 * repeatedly and from several instances: cancelOrder's status guard makes each order cancel once,
 * and an order whose payment arrived in the meantime is skipped.
 */
export async function expireUnpaidOrders(
  olderThanMinutes = env.ORDER_EXPIRY_MINUTES,
  now = Date.now()
) {
  const cutoff = new Date(now - olderThanMinutes * 60_000)
  const stale = await Order.find({
    status: "pending_payment",
    "payment.status": { $ne: "paid" },
    createdAt: { $lt: cutoff },
  })
    .select("_id user")
    .limit(200) // a batch per run; the next sweep takes the rest
    .lean()
  let cancelled = 0
  for (const o of stale) {
    try {
      await cancelOrder(String(o.user), String(o._id), REASON)
      cancelled++
    } catch (err) {
      // Lost a race (paid or cancelled meanwhile): fine, it is no longer ours to expire.
      logger.debug({ err, order: String(o._id) }, "order expiry skipped")
    }
  }
  if (cancelled) logger.info({ cancelled }, "Expired unpaid orders")
  return cancelled
}

registerJob("orders.expire-unpaid", async () => void (await expireUnpaidOrders()), {
  repeatEveryMs: env.ORDER_EXPIRY_SWEEP_SECONDS * 1000,
})
