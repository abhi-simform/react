import { sendEmail } from "../../utils/email.js"
import { User } from "../users/user.model.js"

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

/** Confirmation mail (Mailpit in dev). COD: at placement. Online: when the payment is confirmed (B6). */
export async function notifyPlaced(
  userId: string,
  order: {
    orderNumber: string
    status: string
    pricing: { total: number }
    items: { title: string; qty: number }[]
    payment?: { method?: string | null } | null
  }
) {
  if (order.status !== "placed") return // pending_payment: mailed after the payment succeeds
  const user = await User.findById(userId).lean()
  if (!user) return
  const rows = order.items
    .map((i) => `<li>${i.qty} x ${escapeHtml(i.title)}</li>`)
    .join("")
  const how = order.payment?.method === "razorpay" ? "paid online" : "cash on delivery"
  await sendEmail(
    user.email,
    `Order ${order.orderNumber} confirmed`,
    `<p>Hi ${escapeHtml(user.name)}, thanks for your order <b>${order.orderNumber}</b>.</p><ul>${rows}</ul><p>Total: Rs ${order.pricing.total} (${how}).</p>`
  )
}
