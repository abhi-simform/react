// Run: node --import ./scratch/register-alias.mjs scratch/08-unions.ts
import { canCancel, canReturn } from "../app/features/orders/status.ts"
import { describePayment } from "../app/features/orders/payment.ts"
import { statusColor, statusLabel } from "../app/features/orders/status.ts"
import { renderState, type AsyncState } from "../app/lib/asyncState.ts"
import { ApiError } from "../app/lib/api/errors.ts"

let failures = 0
function check(ok: boolean, message: string) {
  if (!ok) {
    failures++
    console.assert(false, message)
  }
}

// ---- order status
check(canCancel("delivered") === false, "canCancel(delivered)")
check(canCancel("placed") === true, "canCancel(placed)")
check(canCancel("shipped") === false, "canCancel(shipped)")
check(canReturn("delivered") === true, "canReturn(delivered)")
check(canReturn("placed") === false, "canReturn(placed)")
check(canReturn("refunded") === false, "canReturn(refunded)")
check(statusLabel("out_for_delivery") === "Out for delivery", "label")
check(statusLabel("refunded") === "Refunded", "refunded label")
check(statusColor("delivered") === "success", "color")

// ---- payment method
check(
  describePayment({ type: "razorpay", razorpayOrderId: "order_1" }).includes(
    "order_1"
  ),
  "razorpay description"
)
check(describePayment({ type: "cod" }) === "Cash on delivery", "cod")
check(
  describePayment({ type: "cod", note: "bring change" }).includes(
    "bring change"
  ),
  "cod note"
)

// ---- AsyncState
const states: AsyncState<number[]>[] = [
  { status: "idle" },
  { status: "loading" },
  { status: "success", data: [1, 2, 3] },
  {
    status: "error",
    error: new ApiError({ status: 404, code: "NOT_FOUND", message: "nope" }),
  },
]
const rendered = states.map((s) => renderState(s, (d) => `${d.length} items`))
check(rendered[2] === "3 items", "success render")
check(rendered[3] === "Error NOT_FOUND: nope", "error render")

// ---- the three-booleans approach CAN represent impossible states
type ThreeBooleans<T> = { isLoading: boolean; isError: boolean; data?: T }
const impossible: ThreeBooleans<number[]> = {
  isLoading: true,
  isError: true,
  data: [1],
}
check(
  impossible.isLoading && impossible.isError,
  "(demo) three booleans allow loading+error+data"
)
// With AsyncState the same shape does not compile ("loading" carries nothing else):
const cannot: AsyncState<number[]> = {
  status: "loading",
  // @ts-expect-error `data` does not exist on the "loading" member
  data: [1],
}
void cannot

if (failures) process.exit(1)
console.log("2.2 ok")
