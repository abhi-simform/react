import { emitToUser } from "../../realtime/socket.js"
import { notify } from "../notifications/notification.service.js"
import {
  orderTemplate,
  refundSettledTemplate,
} from "../notifications/notification.templates.js"
import type { OrderDoc } from "./order.model.js"

type OrderLike = Pick<
  OrderDoc,
  "_id" | "user" | "orderNumber" | "status" | "statusHistory" | "pricing"
> & {
  payment?: { status?: string | null } | null
  returnRequest?: { status?: string | null; refundAmount?: number | null } | null
}

/**
 * ONE function every order status change goes through, after the change is committed:
 *  1. `order:status` over the socket (live tracking: the client patches its cache from this),
 *  2. the matching in-app notification (+ email) from the templates.
 * `from` is the previous status (lets "delivered" mean "return declined" after return_requested).
 * Fire-and-forget by design: it never throws and never delays the HTTP response.
 */
export async function onOrderStatusChanged(order: OrderLike, from: string | null) {
  const userId = String(order.user)
  const last = order.statusHistory[order.statusHistory.length - 1]
  emitToUser(userId, "order:status", {
    orderId: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    from,
    paymentStatus: order.payment?.status ?? null,
    returnStatus: order.returnRequest?.status ?? null,
    entry: last
      ? { status: last.status, at: last.at, note: last.note ?? null }
      : { status: order.status, at: new Date(), note: null },
  })
  const t = orderTemplate(
    {
      id: String(order._id),
      orderNumber: order.orderNumber,
      total: order.pricing.total,
      refundAmount: order.returnRequest?.refundAmount,
    },
    order.status,
    from
  )
  if (t) await notify(userId, t, { orderId: String(order._id), status: order.status })
}

/** The gateway finished a refund (webhook or instant mock): a payment event, not a status change. */
export async function onRefundSettled(
  order: Pick<OrderDoc, "_id" | "user" | "orderNumber"> & {
    payment?: { status?: string | null } | null
  },
  amount: number
) {
  const userId = String(order.user)
  emitToUser(userId, "order:payment", {
    orderId: String(order._id),
    paymentStatus: order.payment?.status ?? null,
  })
  await notify(
    userId,
    refundSettledTemplate(
      { id: String(order._id), orderNumber: order.orderNumber },
      amount
    ),
    { orderId: String(order._id) }
  )
}
