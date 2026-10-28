import { ApiError } from "@/lib/api/errors"
import type { Paginated } from "@/lib/api/envelope"
import { abortable } from "@/lib/async"
import type { Order, OrderStatus } from "@/types/domain"

/**
 * STUB until B5 (Stage 11 builds the orders backend). The brief for 9.10 is "build it on Query
 * with a stubbed `orderQueries` and swap to the real API later with no component change": these
 * two functions are the ONLY thing that changes (`api("/orders", ...)`). They behave like the
 * future endpoints over in-memory data: paginated, filterable by status, searchable by order
 * number, with fake latency that respects abort.
 *
 * One order is SIMULATED so polling can be watched: `startSimulatedOrder()` creates an order
 * that walks placed -> packed -> shipped -> out_for_delivery -> delivered, one step every
 * `STEP_MS`, based on the clock (the "server" decides the status when it is asked).
 */
const STEP_MS = 10_000
const FLOW: OrderStatus[] = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
]

const address = {
  fullName: "Casey Customer",
  phone: "9876543210",
  line1: "12, MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  type: "home" as const,
}

const SAMPLE_ITEMS = [
  { title: "Noise C33 Smartwatch", unitPrice: 2536 },
  { title: "Boldfit N25 Yoga Mat", unitPrice: 799 },
  { title: "Wakefit M91 Sofa Set", unitPrice: 20293 },
]

function makeOrder(
  n: number,
  status: OrderStatus,
  createdAt: string,
  extra: Partial<Order> = {}
): Order {
  const items = SAMPLE_ITEMS.slice(0, (n % 3) + 1).map((s, i) => ({
    sku: `SKU-${n}-${i}`,
    productId: `p${i}`,
    title: s.title,
    image: "/placeholder.svg",
    unitPrice: s.unitPrice,
    qty: 1 + (n % 2),
    lineTotal: s.unitPrice * (1 + (n % 2)),
  }))
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0)
  const tax = Math.round(subtotal * 0.18)
  return {
    _id: `ord-${n}`,
    orderNumber: `SS-${1000 + n}`,
    userId: "me",
    items,
    addressSnapshot: address,
    status,
    statusHistory: [{ status: "placed", at: createdAt }],
    pricing: { subtotal, discount: 0, shipping: 0, tax, total: subtotal + tax },
    paymentMethod: n % 2 ? "razorpay" : "cod",
    createdAt,
    ...extra,
  }
}

const STATUS_CYCLE: OrderStatus[] = [
  "delivered",
  "delivered",
  "shipped",
  "placed",
  "cancelled",
  "delivered",
  "packed",
  "returned",
]
const base: Order[] = Array.from({ length: 24 }, (_, i) =>
  makeOrder(
    i + 1,
    STATUS_CYCLE[i % STATUS_CYCLE.length]!,
    new Date(Date.UTC(2026, 9, 27 - i)).toISOString()
  )
)

const simulated = new Map<string, { n: number; startedAt: number }>()

/** Create an order that progresses by itself (dev helper for the orders page). */
export function startSimulatedOrder(): string {
  const n = 100 + simulated.size
  simulated.set(`ord-${n}`, { n, startedAt: Date.now() })
  return `ord-${n}`
}

/** The "server's" view of a simulated order right now. */
function simulatedOrder(id: string): Order | undefined {
  const sim = simulated.get(id)
  if (!sim) return undefined
  const steps = Math.min(
    FLOW.length - 1,
    Math.floor((Date.now() - sim.startedAt) / STEP_MS)
  )
  const history = FLOW.slice(0, steps + 1).map((status, i) => ({
    status,
    at: new Date(sim.startedAt + i * STEP_MS).toISOString(),
  }))
  return makeOrder(sim.n, FLOW[steps]!, new Date(sim.startedAt).toISOString(), {
    statusHistory: history,
  })
}

const all = (): Order[] => [
  ...[...simulated.keys()].map((id) => simulatedOrder(id)!).reverse(),
  ...base,
]

export type OrdersFilter = { status?: OrderStatus; search?: string }

export async function getOrders(
  filter: OrdersFilter,
  page: number,
  signal?: AbortSignal
): Promise<Paginated<Order>> {
  await abortable(400, signal)
  const q = filter.search?.trim().toLowerCase()
  const rows = all().filter(
    (o) =>
      (!filter.status || o.status === filter.status) &&
      (!q || o.orderNumber.toLowerCase().includes(q))
  )
  const limit = 8
  const totalPages = Math.max(1, Math.ceil(rows.length / limit))
  return {
    items: rows.slice((page - 1) * limit, page * limit),
    meta: {
      page,
      limit,
      total: rows.length,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}

export async function getOrder(
  id: string,
  signal?: AbortSignal
): Promise<Order> {
  await abortable(250, signal)
  const order = simulatedOrder(id) ?? all().find((o) => o._id === id)
  if (!order)
    throw new ApiError({
      status: 404,
      code: "NOT_FOUND",
      message: "HTTP 404: Order not found",
    })
  return order
}
