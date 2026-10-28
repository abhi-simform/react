import { assertNever } from "@/lib/assert"

export type PaymentMethod =
  { type: "razorpay"; razorpayOrderId: string } | { type: "cod"; note?: string }

export function describePayment(method: PaymentMethod): string {
  switch (method.type) {
    case "razorpay":
      // `razorpayOrderId` is only accessible here: the switch narrowed `method`.
      return `Paid online (Razorpay order ${method.razorpayOrderId})`
    case "cod":
      return method.note
        ? `Cash on delivery: ${method.note}`
        : "Cash on delivery"
    default:
      return assertNever(method)
  }
}
