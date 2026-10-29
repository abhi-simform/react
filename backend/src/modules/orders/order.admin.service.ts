import { Types } from "mongoose"
import { ApiError } from "../../utils/ApiError.js"
import { Payment, toPublicPayment } from "../payments/payment.model.js"
import { Product } from "../products/product.model.js"
import { User } from "../users/user.model.js"
import { Order, toPublicOrder, type OrderStatus } from "./order.model.js"

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const IST_MS = 330 * 60_000
const istStart = (ymd: string) => new Date(Date.parse(`${ymd}T00:00:00.000Z`) - IST_MS)

type Customer = { _id: unknown; name: string; email: string; phone?: string | null }
type OrderRow = Parameters<typeof toPublicOrder>[0] & {
  staffNotes?: { text: string; byName?: string | null; at: Date }[] | null
}

const toAdminOrder = (o: OrderRow, customer?: Customer | null) => ({
  ...toPublicOrder(o),
  customer: customer
    ? {
        id: String(customer._id),
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? null,
      }
    : null,
  staffNotes: (o.staffNotes ?? []).map((n) => ({
    text: n.text,
    by: n.byName ?? null,
    at: n.at,
  })),
})

async function customersFor(ids: Types.ObjectId[]) {
  const users = await User.find({ _id: { $in: ids } })
    .select("name email phone")
    .lean()
  return new Map(users.map((u) => [String(u._id), u]))
}

type AdminListQuery = {
  page: number
  limit: number
  status?: OrderStatus
  search?: string
  paymentMethod?: "cod" | "razorpay"
  from?: string
  to?: string
  sort: "createdAt" | "total"
  order: "asc" | "desc"
}

async function adminFilter(q: Omit<AdminListQuery, "page" | "limit">) {
  const filter: Record<string, unknown> = {}
  if (q.status) filter.status = q.status
  if (q.paymentMethod) filter["payment.method"] = q.paymentMethod
  if (q.from || q.to)
    filter.createdAt = {
      ...(q.from ? { $gte: istStart(q.from) } : {}),
      ...(q.to ? { $lt: new Date(istStart(q.to).getTime() + 86_400_000) } : {}),
    }
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), "i")
    const users = await User.find({ $or: [{ name: rx }, { email: rx }] })
      .select("_id")
      .limit(100)
      .lean()
    filter.$or = [{ orderNumber: rx }, { user: { $in: users.map((u) => u._id) } }]
  }
  return filter
}
const sortOf = (q: { sort: "createdAt" | "total"; order: "asc" | "desc" }) =>
  ({
    [q.sort === "total" ? "pricing.total" : "createdAt"]: q.order === "asc" ? 1 : -1,
    _id: q.order === "asc" ? 1 : -1,
  }) as Record<string, 1 | -1>

export async function adminListOrders(q: AdminListQuery) {
  const filter = await adminFilter(q)
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort(sortOf(q))
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  const customers = await customersFor(rows.map((r) => r.user))
  return {
    items: rows.map((r) => toAdminOrder(r as OrderRow, customers.get(String(r.user)))),
    total,
  }
}

/** Order + customer + its payment (with refunds): everything the admin detail page shows. */
/** The returns queue shows who asked: the same admin shape as the orders list. */
export async function toAdminOrders(rows: { user: Types.ObjectId }[]) {
  const customers = await customersFor(rows.map((r) => r.user))
  return rows.map((r) =>
    toAdminOrder(r as unknown as OrderRow, customers.get(String(r.user)))
  )
}

export async function adminGetOrder(id: string) {
  const o = await Order.findById(id).lean()
  if (!o) throw ApiError.notFound("Order not found")
  const [customer, payment] = await Promise.all([
    User.findById(o.user).select("name email phone").lean(),
    Payment.findOne({ order: o._id }).lean(),
  ])
  const pub = payment ? toPublicPayment(payment) : null
  const reserved = pub
    ? pub.refunds.filter((r) => r.status !== "failed").reduce((n, r) => n + r.amount, 0)
    : 0
  return {
    ...toAdminOrder(o as OrderRow, customer),
    payment: pub
      ? {
          ...pub,
          // What an admin may still refund (only a captured online payment can be).
          refundable: pub.status === "paid" ? Math.max(0, pub.amount - reserved) : 0,
        }
      : null,
  }
}

export async function addNote(actor: { id: string }, id: string, text: string) {
  const user = await User.findById(actor.id).select("name").lean()
  const o = await Order.findByIdAndUpdate(
    id,
    {
      $push: {
        staffNotes: {
          text,
          by: new Types.ObjectId(actor.id),
          byName: user?.name,
          at: new Date(),
        },
      },
    },
    { returnDocument: "after" }
  ).lean()
  if (!o) throw ApiError.notFound("Order not found")
  return adminGetOrder(id)
}

// A cell starting with = + - @ is run as a formula by spreadsheets: neutralise it.
const csvCell = (v: unknown) => {
  let s = v == null ? "" : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function exportOrdersCsv(q: Omit<AdminListQuery, "page" | "limit">) {
  const rows = await Order.find(await adminFilter(q))
    .sort(sortOf(q))
    .limit(5000)
    .lean()
  const customers = await customersFor(rows.map((r) => r.user))
  const head = [
    "orderNumber",
    "createdAt",
    "status",
    "customer",
    "email",
    "items",
    "total",
    "paymentMethod",
    "paymentStatus",
  ]
  const lines = rows.map((o) => {
    const c = customers.get(String(o.user))
    return [
      o.orderNumber,
      o.createdAt.toISOString(),
      o.status,
      c?.name,
      c?.email,
      o.items.reduce((n, i) => n + i.qty, 0),
      o.pricing.total,
      o.payment?.method,
      o.payment?.status,
    ]
      .map(csvCell)
      .join(",")
  })
  return [head.join(","), ...lines].join("\n")
}

// ---- seller view: only your own lines ----------------------------------------------------------

async function ownProductIds(sellerId: string) {
  const rows = await Product.find({ seller: new Types.ObjectId(sellerId) })
    .select("_id")
    .lean()
  return rows.map((r) => r._id)
}

/** A seller sees what they must ship, never what the customer paid in total or how. */
function toSellerOrder(o: OrderRow, ids: Set<string>) {
  const pub = toPublicOrder(o)
  const items = pub.items.filter((i) => ids.has(i.productId))
  return {
    id: pub.id,
    orderNumber: pub.orderNumber,
    status: pub.status,
    createdAt: pub.createdAt,
    items,
    yourTotal: items.reduce((n, i) => n + i.lineTotal, 0),
    units: items.reduce((n, i) => n + i.qty, 0),
    addressSnapshot: pub.addressSnapshot,
    delivery: pub.delivery,
    shipment: pub.shipment,
    statusHistory: pub.statusHistory,
    paymentMethod: pub.paymentMethod,
  }
}

export async function sellerListOrders(
  sellerId: string,
  q: { page: number; limit: number; status?: OrderStatus; search?: string }
) {
  const ids = await ownProductIds(sellerId)
  const set = new Set(ids.map(String))
  const filter: Record<string, unknown> = {
    "items.product": { $in: ids },
    status: q.status ?? { $ne: "pending_payment" },
  }
  if (q.search) filter.orderNumber = new RegExp(escapeRegex(q.search), "i")
  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Order.countDocuments(filter),
  ])
  return { items: rows.map((r) => toSellerOrder(r as OrderRow, set)), total }
}

/** Someone else's order (no line of yours in it) is a 404, exactly like a missing one. */
export async function sellerGetOrder(sellerId: string, id: string) {
  const ids = await ownProductIds(sellerId)
  const o = await Order.findOne({
    _id: id,
    "items.product": { $in: ids },
    status: { $ne: "pending_payment" },
  }).lean()
  if (!o) throw ApiError.notFound("Order not found")
  return toSellerOrder(o as OrderRow, new Set(ids.map(String)))
}
