import type { Category } from "./notification.model.js"

/**
 * Message templates, in code (a copy-edit is a code change in this build; an admin editor for them is
 * the "notification templates" screen of the admin plan). Pure functions: easy to test, no I/O.
 */
export type Template = {
  category: Category
  type: string
  title: string
  body: string
  link: string
  /** Send an email as well (still subject to the user's preference). */
  email: boolean
}

type OrderRef = {
  id: string
  orderNumber: string
  total?: number
  refundAmount?: number | null
}

const link = (o: OrderRef) => `/orders/${o.id}`

export function orderTemplate(
  o: OrderRef,
  status: string,
  from: string | null
): Template | null {
  const n = o.orderNumber
  const base = { category: "orders" as const, link: link(o) }
  switch (status) {
    case "placed":
      return {
        ...base,
        type: "order.placed",
        title: `Order ${n} confirmed`,
        body: "Thanks for your order. We will let you know when it ships.",
        email: true,
      }
    case "packed":
      return {
        ...base,
        type: "order.packed",
        title: `Order ${n} is packed`,
        body: "Your items are packed and waiting for pickup.",
        email: false,
      }
    case "shipped":
      return {
        ...base,
        type: "order.shipped",
        title: `Order ${n} has shipped`,
        body: "It is on the way. Track it live from your orders.",
        email: true,
      }
    case "out_for_delivery":
      return {
        ...base,
        type: "order.out_for_delivery",
        title: `Order ${n} is out for delivery`,
        body: "It should reach you today.",
        email: false,
      }
    case "delivered":
      if (from === "return_requested")
        return {
          ...base,
          type: "return.rejected",
          title: `Return for ${n} was declined`,
          body: "The order stays as delivered. Open it for the reason.",
          email: true,
        }
      return {
        ...base,
        type: "order.delivered",
        title: `Order ${n} was delivered`,
        body: "Enjoy! You have 7 days to return it and you can rate the items now.",
        email: true,
      }
    case "cancelled":
      return {
        ...base,
        type: "order.cancelled",
        title: `Order ${n} was cancelled`,
        body: "If you paid online, the refund goes back to your original payment method.",
        email: true,
      }
    case "return_requested":
      return {
        ...base,
        type: "return.requested",
        title: `Return requested for ${n}`,
        body: "We received your request and will review it shortly.",
        email: true,
      }
    case "returned":
      return {
        ...base,
        type: "return.approved",
        title: `Return approved for ${n}`,
        body: "Your pickup is arranged. The refund follows once we receive the items.",
        email: true,
      }
    case "refunded":
      return {
        ...base,
        type: "return.refunded",
        title: `Refund started for ${n}`,
        body: o.refundAmount
          ? `Rs ${o.refundAmount} is on its way back to you.`
          : "Your money is on its way back to you.",
        email: true,
      }
    default:
      return null // pending_payment etc.: nothing to tell the shopper yet
  }
}

export const refundSettledTemplate = (o: OrderRef, amount: number): Template => ({
  category: "orders",
  type: "payment.refunded",
  title: `Refund of Rs ${amount} processed`,
  body: `The refund for order ${o.orderNumber} has been sent to your payment method.`,
  link: link(o),
  email: true,
})

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export function emailHtml(
  name: string,
  t: Pick<Template, "title" | "body">,
  clientUrl: string,
  path: string
) {
  return `<p>Hi ${escapeHtml(name)},</p><p><b>${escapeHtml(t.title)}</b></p><p>${escapeHtml(t.body)}</p><p><a href="${clientUrl}${path}">Open in ShopSphere</a></p>`
}
