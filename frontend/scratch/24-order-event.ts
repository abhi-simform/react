// Run: node --import ./scratch/register-alias.mjs scratch/24-order-event.ts
import { patchOrder } from "../app/features/realtime/cache.ts"
import { safeSitePath } from "../app/features/notifications/link.ts"
import type { Order } from "../app/types/domain.ts"

let failures = 0
const check = (ok: boolean, message: string) => {
  if (!ok) {
    failures++
    console.error("FAIL:", message)
  }
}

const order = {
  status: "placed",
  paymentStatus: "pending",
  statusHistory: [{ status: "placed", at: "2026-01-01T10:00:00.000Z" }],
} as unknown as Order
const ev = {
  orderId: "o1",
  orderNumber: "SS-1",
  status: "packed",
  from: "placed",
  paymentStatus: null,
  returnStatus: null,
  entry: { status: "packed", at: "2026-01-01T11:00:00.000Z", note: null },
}
const once = patchOrder(order, ev)
check(once.status === "packed", "status replaced")
check(once.statusHistory.length === 2, "history line appended")
check(once.paymentStatus === "pending", "null paymentStatus keeps the old one")
check(order.statusHistory.length === 1, "input not mutated")
const twice = patchOrder(once, ev)
check(twice.statusHistory.length === 2, "a duplicate delivery appends nothing")
check(
  patchOrder(once, { ...ev, status: "shipped", paymentStatus: "paid", entry: { status: "shipped", at: "2026-01-01T12:00:00.000Z", note: "x" } })
    .paymentStatus === "paid",
  "paymentStatus from the event wins"
)

check(safeSitePath("/orders/1") === "/orders/1", "site path ok")
check(safeSitePath("//evil.com") === null, "protocol-relative refused")
check(safeSitePath("https://evil.com") === null, "absolute refused")
check(safeSitePath("javascript:alert(1)") === null, "javascript: refused")
check(safeSitePath(null) === null, "null")
console.log(
  failures === 0 ? "24-order-event: ok" : `24-order-event: ${failures} failures`
)
if (failures) process.exit(1)
