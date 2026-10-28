import { randomBytes } from "node:crypto"
import mongoose, { Types } from "mongoose"
import { env, paymentMock } from "../../config/env.js"
import { logger } from "../../config/logger.js"
import { ApiError } from "../../utils/ApiError.js"
import { notifyPlaced } from "../orders/order.mail.js"
import { Order } from "../orders/order.model.js"
import { User } from "../users/user.model.js"
import {
  MOCK_WEBHOOK_SECRET,
  MOCK_KEY_SECRET,
  getGateway,
  signPayment,
  signWebhook,
  type PaymentGateway,
} from "./gateway.js"
import { Payment, WebhookEvent } from "./payment.model.js"

const toPaise = (rupees: number) => rupees * 100
const rand = () => randomBytes(7).toString("hex")

function gatewayOrThrow(): PaymentGateway {
  const g = getGateway()
  if (!g)
    throw new ApiError(
      503,
      "PAYMENTS_NOT_CONFIGURED",
      "Online payments are not configured on this server"
    )
  return g
}

export function paymentConfig() {
  const g = getGateway()
  return {
    configured: Boolean(g),
    provider: g?.name ?? null,
    keyId: g?.keyId ?? null,
    mock: g?.name === "mock",
  }
}

// ---- 1. create the provider order -------------------------------------------------------------

/**
 * Step 1 of the flow: give the browser what `checkout.js` needs. Idempotent per order: a retry
 * (closed modal, failed attempt, reload) gets the SAME provider order back, never an orphan.
 */
export async function createPaymentOrder(userId: string, orderId: string) {
  const gateway = gatewayOrThrow()
  const order = await Order.findOne({ _id: orderId, user: userId })
  if (!order) throw ApiError.notFound("Order not found")
  if (order.payment?.method !== "razorpay")
    throw new ApiError(
      409,
      "NOT_ONLINE_PAYMENT",
      "This order is cash on delivery; there is nothing to pay online"
    )
  if (order.status !== "pending_payment")
    throw new ApiError(
      409,
      "ORDER_NOT_PAYABLE",
      order.payment.status === "paid"
        ? "This order is already paid"
        : `An order that is ${order.status.replaceAll("_", " ")} cannot be paid`,
      { status: order.status, paymentStatus: order.payment.status }
    )

  let payment = await Payment.findOne({ order: order._id })
  if (payment && payment.provider !== gateway.name) {
    // Keys were switched (mock -> real) since the order was created: the old provider order is useless.
    const fresh = await gateway.createOrder({
      amountPaise: toPaise(order.pricing.total),
      receipt: order.orderNumber,
    })
    payment.provider = gateway.name
    payment.providerOrderId = fresh.id
    payment.status = "created"
    await payment.save()
  }
  if (!payment) {
    const provider = await gateway.createOrder({
      amountPaise: toPaise(order.pricing.total),
      receipt: order.orderNumber,
    })
    try {
      payment = await Payment.create({
        order: order._id,
        user: userId,
        orderNumber: order.orderNumber,
        provider: gateway.name,
        providerOrderId: provider.id,
        amount: order.pricing.total,
      })
    } catch (err) {
      // Two tabs raced: the unique index on `order` lets one win; the loser uses its payment.
      if ((err as { code?: number }).code !== 11000) throw err
      payment = await Payment.findOne({ order: order._id })
      if (!payment) throw err
    }
  }
  const user = await User.findById(userId).lean()
  return {
    paymentId: String(payment._id),
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    provider: gateway.name,
    mock: gateway.name === "mock",
    keyId: gateway.keyId,
    providerOrderId: payment.providerOrderId,
    amount: toPaise(order.pricing.total), // paise, exactly what Razorpay expects
    currency: "INR",
    prefill: {
      name: order.addressSnapshot?.fullName ?? user?.name ?? "",
      email: user?.email ?? "",
      contact: order.addressSnapshot?.phone ?? user?.phone ?? "",
    },
  }
}

// ---- 2. settle: the ONLY places an order becomes paid or a payment fails ----------------------

type PaidInfo = { paymentId: string; method?: string; verified?: boolean }

/**
 * Money arrived. Idempotent and race-safe: the status guard means the browser callback (verify)
 * and the webhook can both call this, in any order, any number of times; exactly one does the work.
 * If the order was cancelled in the meantime the captured money is refunded straight away.
 */
export async function markPaid(providerOrderId: string, info: PaidInfo) {
  const result = await mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findOneAndUpdate(
      { providerOrderId, status: { $in: ["created", "failed", "cancelled"] } },
      {
        $set: {
          status: "paid",
          providerPaymentId: info.paymentId,
          method: info.method,
          paidAt: new Date(),
          failureCode: null,
          failureReason: null,
          ...(info.verified ? { signatureVerifiedAt: new Date() } : {}),
        },
      },
      { session, returnDocument: "after" }
    )
    if (!payment) return { first: false as const }
    const order = await Order.findOneAndUpdate(
      { _id: payment.order, status: "pending_payment" },
      {
        $set: { status: "placed", "payment.status": "paid" },
        $push: {
          statusHistory: {
            status: "placed",
            at: new Date(),
            note: "Payment received",
          },
        },
      },
      { session, returnDocument: "after" }
    )
    if (!order) {
      // Paid after cancellation (modal left open, or an expired order): keep the money safe.
      await Order.updateOne(
        { _id: payment.order, status: "cancelled" },
        { $set: { "payment.status": "refund_pending" } },
        { session }
      )
    }
    return { first: true as const, payment, order }
  })
  if (result.first) {
    if (result.order) void notifyPlaced(String(result.order.user), result.order)
    else
      await refundOrder(String(result.payment.order), {
        reason: "Payment received after the order was cancelled",
      }).catch((err) => logger.error({ err }, "Auto-refund of a late payment failed"))
  }
  return Payment.findOne({ providerOrderId })
}

async function markFailed(
  providerOrderId: string,
  info: { paymentId?: string; code?: string; reason?: string; method?: string }
) {
  const payment = await Payment.findOneAndUpdate(
    { providerOrderId, status: { $in: ["created", "failed"] } }, // a paid payment never goes back
    {
      $set: {
        status: "failed",
        failureCode: info.code,
        failureReason: info.reason ?? "Payment failed",
        method: info.method,
      },
      $inc: { attempts: 1 },
    },
    { returnDocument: "after" }
  )
  if (payment)
    await Order.updateOne(
      { _id: payment.order, status: "pending_payment" },
      { $set: { "payment.status": "failed" } }
    )
  return payment
}

// ---- 3. verify (the browser's "handler" proof) ------------------------------------------------

export async function verifyPayment(
  userId: string,
  input: {
    orderId: string
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }
) {
  const gateway = gatewayOrThrow()
  const payment = await Payment.findOne({ order: input.orderId, user: userId })
  if (!payment) throw ApiError.notFound("No payment was started for this order")
  if (payment.providerOrderId !== input.razorpay_order_id)
    throw new ApiError(400, "ORDER_MISMATCH", "The payment does not belong to this order")
  const good = gateway.verifyPaymentSignature({
    orderId: input.razorpay_order_id,
    paymentId: input.razorpay_payment_id,
    signature: input.razorpay_signature,
  })
  if (!good) {
    logger.warn({ orderId: input.orderId, userId }, "Payment signature mismatch")
    throw new ApiError(
      400,
      "SIGNATURE_MISMATCH",
      "We could not verify this payment. If money was deducted, contact support with your order number"
    )
  }
  await markPaid(input.razorpay_order_id, {
    paymentId: input.razorpay_payment_id,
    verified: true,
  })
  return (await Order.findById(input.orderId))!
}

// ---- 4. webhook (the source of truth) ---------------------------------------------------------

type RazorpayEvent = {
  event: string
  payload?: {
    payment?: {
      entity?: {
        id: string
        order_id?: string
        amount?: number
        method?: string
        error_code?: string
        error_description?: string
      }
    }
    order?: { entity?: { id: string } }
    refund?: {
      entity?: { id: string; payment_id?: string; amount?: number; status?: string }
    }
  }
}

/**
 * Handle a webhook delivery. `rawBody` is the exact bytes received (the signature covers them, so
 * re-serialising parsed JSON would not match). At-least-once delivery means duplicates are normal:
 * handlers are idempotent and the event id is recorded.
 */
export async function processWebhook(
  rawBody: Buffer,
  signature: string | undefined,
  eventIdHeader: string | undefined
) {
  const gateway = gatewayOrThrow()
  if (!signature || !gateway.verifyWebhookSignature(rawBody, signature))
    throw new ApiError(400, "INVALID_SIGNATURE", "Webhook signature does not match")
  let evt: RazorpayEvent
  try {
    evt = JSON.parse(rawBody.toString("utf8")) as RazorpayEvent
  } catch {
    throw ApiError.badRequest("Webhook body is not JSON")
  }
  const pay = evt.payload?.payment?.entity
  const eventId =
    eventIdHeader ??
    `${evt.event}:${pay?.id ?? evt.payload?.refund?.entity?.id ?? rand()}`
  if (await WebhookEvent.exists({ eventId })) return { duplicate: true as const }

  switch (evt.event) {
    case "payment.captured":
    case "order.paid": {
      const orderId = pay?.order_id ?? evt.payload?.order?.entity?.id
      if (!orderId || !pay?.id) break
      const known = await Payment.findOne({ providerOrderId: orderId })
      if (!known) break
      if (pay.amount !== undefined && pay.amount !== toPaise(known.amount)) {
        logger.error({ orderId, got: pay.amount }, "Webhook amount mismatch; ignored")
        break
      }
      await markPaid(orderId, { paymentId: pay.id, method: pay.method })
      break
    }
    case "payment.failed": {
      if (!pay?.order_id) break
      await markFailed(pay.order_id, {
        paymentId: pay.id,
        code: pay.error_code,
        reason: pay.error_description,
        method: pay.method,
      })
      break
    }
    case "refund.processed":
    case "refund.failed": {
      const r = evt.payload?.refund?.entity
      if (r) await settleRefund(r.id, evt.event === "refund.processed")
      break
    }
    default:
      break // payment.authorized etc.: nothing to do
  }
  await WebhookEvent.updateOne(
    { eventId },
    { $setOnInsert: { eventId, type: evt.event } },
    { upsert: true }
  )
  return { duplicate: false as const }
}

// ---- 5. refunds --------------------------------------------------------------------------------

/**
 * Refund (part of) a paid payment. Reserves the amount first with a guarded update, so two
 * concurrent refunds can never exceed what was paid.
 */
export async function refundOrder(
  orderId: string,
  opts: { amount?: number; reason?: string } = {}
) {
  const gateway = gatewayOrThrow()
  const payment = await Payment.findOne({ order: orderId })
  if (!payment || !payment.paidAt || !payment.providerPaymentId)
    throw new ApiError(409, "NOT_PAID", "This order has no captured payment to refund")
  const reserved = payment.refunds
    .filter((r) => r.status !== "failed")
    .reduce((n, r) => n + r.amount, 0)
  const amount = opts.amount ?? payment.amount - reserved
  if (amount <= 0 || reserved + amount > payment.amount)
    throw new ApiError(
      409,
      "REFUND_EXCEEDS_PAYMENT",
      `Only Rs ${payment.amount - reserved} is left to refund`,
      { refundable: payment.amount - reserved }
    )
  // Guard against a parallel refund: only reserve if the refunds array is unchanged in length.
  const guarded = await Payment.findOneAndUpdate(
    { _id: payment._id, refunds: { $size: payment.refunds.length } },
    {
      $push: {
        refunds: {
          providerRefundId: `pending_${rand()}`,
          amount,
          status: "pending",
          reason: opts.reason,
        },
      },
    },
    { returnDocument: "after" }
  )
  if (!guarded)
    throw ApiError.conflict(
      "Another refund is being processed, try again",
      "REFUND_IN_PROGRESS"
    )
  const placeholder = guarded.refunds[guarded.refunds.length - 1]!.providerRefundId
  try {
    const r = await gateway.refund({
      paymentId: payment.providerPaymentId,
      amountPaise: toPaise(amount),
      reason: opts.reason,
    })
    await Payment.updateOne(
      { _id: payment._id, "refunds.providerRefundId": placeholder },
      { $set: { "refunds.$.providerRefundId": r.id } }
    )
    await Order.updateOne(
      { _id: orderId },
      { $set: { "payment.status": "refund_pending" } }
    )
    if (r.status === "processed") await settleRefund(r.id, true)
  } catch (err) {
    await Payment.updateOne(
      { _id: payment._id, "refunds.providerRefundId": placeholder },
      { $set: { "refunds.$.status": "failed" } }
    )
    throw err
  }
  return (await Payment.findById(payment._id))!
}

/** A refund reached its final state (webhook, or instantly for the mock). Idempotent. */
export async function settleRefund(providerRefundId: string, success: boolean) {
  const payment = await Payment.findOneAndUpdate(
    { refunds: { $elemMatch: { providerRefundId, status: "pending" } } },
    success
      ? {
          $set: {
            "refunds.$.status": "processed",
            "refunds.$.processedAt": new Date(),
          },
        }
      : { $set: { "refunds.$.status": "failed" } },
    { returnDocument: "after" }
  )
  if (!payment) return null // duplicate delivery
  const processed = payment.refunds
    .filter((r) => r.status === "processed")
    .reduce((n, r) => n + r.amount, 0)
  const pending = payment.refunds.some((r) => r.status === "pending")
  payment.refundedAmount = processed
  await payment.save()
  const full = processed >= payment.amount
  await Order.updateOne(
    { _id: payment.order },
    {
      $set: {
        "payment.status": full
          ? "refunded"
          : pending
            ? "refund_pending"
            : processed > 0
              ? "partially_refunded"
              : "paid",
      },
    }
  )
  return payment
}

// ---- hooks called by the order module ---------------------------------------------------------

/** Order cancelled (customer or staff): refund a captured payment, close an unpaid one. */
export async function onOrderCancelled(order: {
  _id: unknown
  payment?: { method?: string | null } | null
}) {
  if (order.payment?.method !== "razorpay") return
  const id = String(order._id)
  await Payment.updateOne(
    { order: id, status: { $in: ["created", "failed"] } },
    { $set: { status: "cancelled" } }
  )
  const paid = await Payment.exists({ order: id, status: "paid" })
  if (paid)
    await refundOrder(id, { reason: "Order cancelled" }).catch((err) =>
      logger.error(
        { err, orderId: id },
        "Refund after cancel failed; retry from /admin/payments"
      )
    )
}

/** Return approved and money is due back: refund the returned items' share (or the full total). */
export async function onRefundDue(order: {
  _id: unknown
  payment?: { method?: string | null } | null
  pricing: { total: number }
  returnRequest?: { refundAmount?: number | null } | null
}) {
  if (order.payment?.method !== "razorpay") return
  const id = String(order._id)
  if (!(await Payment.exists({ order: id, status: "paid" }))) return
  await refundOrder(id, {
    amount: order.returnRequest?.refundAmount ?? undefined,
    reason: "Return refund",
  }).catch((err) =>
    logger.error(
      { err, orderId: id },
      "Refund after return failed; retry from /admin/payments"
    )
  )
}

// ---- reads --------------------------------------------------------------------------------------

export async function listPayments(
  userId: string | null,
  q: { page: number; limit: number; status?: string; orderId?: string }
) {
  const filter: Record<string, unknown> = {}
  if (userId) filter.user = new Types.ObjectId(userId)
  if (q.status) filter.status = q.status
  if (q.orderId) filter.order = new Types.ObjectId(q.orderId)
  const [items, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Payment.countDocuments(filter),
  ])
  return { items, total }
}

// ---- the mock gateway and the local webhook simulator -----------------------------------------

const webhookSecret = () =>
  paymentMock ? MOCK_WEBHOOK_SECRET : (env.RAZORPAY_WEBHOOK_SECRET ?? "")

/** Sign an event and hand it to the real webhook handler (what Razorpay's servers would do). */
export async function deliverWebhook(event: RazorpayEvent) {
  const raw = Buffer.from(JSON.stringify(event))
  const secret = webhookSecret()
  if (!secret)
    throw new ApiError(
      409,
      "WEBHOOK_SECRET_MISSING",
      "Set RAZORPAY_WEBHOOK_SECRET to simulate webhooks against real keys"
    )
  return processWebhook(raw, signWebhook(secret, raw), `evt_sim_${rand()}`)
}

export type MockOutcome = "success" | "success_no_callback" | "failure"

/**
 * What the Razorpay modal + servers would do, for the mock gateway only. The browser gets the
 * handler payload (or an error) back immediately; the "webhook" follows MOCK_WEBHOOK_DELAY_MS later.
 * `success_no_callback` simulates the shopper closing the tab right after paying: only the webhook
 * ever arrives, and the order must still end up paid.
 */
export async function mockPay(
  userId: string,
  input: { orderId: string; outcome: MockOutcome; method?: string }
) {
  if (getGateway()?.name !== "mock")
    throw new ApiError(404, "NOT_FOUND", "The mock gateway is not active")
  const payment = await Payment.findOne({ order: input.orderId, user: userId })
  if (!payment || payment.provider !== "mock")
    throw ApiError.notFound("No mock payment started for this order")
  const paymentId = `pay_mock_${rand()}`
  const method = input.method ?? "card"
  const event: RazorpayEvent =
    input.outcome === "failure"
      ? {
          event: "payment.failed",
          payload: {
            payment: {
              entity: {
                id: paymentId,
                order_id: payment.providerOrderId,
                amount: toPaise(payment.amount),
                method,
                error_code: "BAD_REQUEST_ERROR",
                error_description: "Your card was declined (mock gateway)",
              },
            },
          },
        }
      : {
          event: "payment.captured",
          payload: {
            payment: {
              entity: {
                id: paymentId,
                order_id: payment.providerOrderId,
                amount: toPaise(payment.amount),
                method,
              },
            },
          },
        }
  const deliver = () =>
    deliverWebhook(event).catch((err) => logger.error({ err }, "Mock webhook failed"))
  if (env.MOCK_WEBHOOK_DELAY_MS === 0) await deliver()
  else setTimeout(() => void deliver(), env.MOCK_WEBHOOK_DELAY_MS).unref()

  if (input.outcome === "failure")
    return {
      ok: false as const,
      error: {
        code: "BAD_REQUEST_ERROR",
        description: event.payload!.payment!.entity!.error_description!,
        paymentId,
      },
    }
  if (input.outcome === "success_no_callback") return { ok: true as const, handler: null }
  return {
    ok: true as const,
    handler: {
      razorpay_payment_id: paymentId,
      razorpay_order_id: payment.providerOrderId,
      razorpay_signature: signPayment(
        MOCK_KEY_SECRET,
        payment.providerOrderId,
        paymentId
      ),
    },
  }
}

/** Dev tool (non-production): fire a signed webhook for an order, e.g. against real test keys. */
export async function simulateWebhook(
  userId: string,
  input: {
    orderId: string
    event: "payment.captured" | "payment.failed"
    paymentId?: string
  }
) {
  const payment = await Payment.findOne({ order: input.orderId, user: userId })
  if (!payment) throw ApiError.notFound("No payment was started for this order")
  const entity = {
    id: input.paymentId ?? `pay_sim_${rand()}`,
    order_id: payment.providerOrderId,
    amount: toPaise(payment.amount),
    method: "card",
    ...(input.event === "payment.failed"
      ? { error_code: "BAD_REQUEST_ERROR", error_description: "Simulated failure" }
      : {}),
  }
  return deliverWebhook({ event: input.event, payload: { payment: { entity } } })
}
