import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { http, HttpResponse, delay } from "msw"
import { describe, expect, it, vi } from "vitest"

import { API, fail, ok, server } from "@/test/server"
import { renderWithQuery } from "@/test/render"
import { RefundDialog, validateRefundAmount } from "./RefundDialog"
import type { PaymentInfo } from "./types"

const payment: PaymentInfo = {
  id: "pay1",
  provider: "mock",
  status: "paid",
  method: "card",
  amount: 1000,
  refundedAmount: 200,
  refundable: 800,
  paidAt: null,
  refunds: [],
}

describe("validateRefundAmount", () => {
  it.each([
    ["800", { ok: true, amount: 800 }],
    ["1", { ok: true, amount: 1 }],
    ["1,000", { ok: false }], // more than the 800 left
    ["801", { ok: false }],
    ["0", { ok: false }],
    ["12.5", { ok: false }], // whole rupees only
    ["", { ok: false }],
    ["abc", { ok: false }],
    ["-5", { ok: false }],
  ] as const)("%j -> %j", (input, expected) => {
    expect(validateRefundAmount(input, 800)).toMatchObject(expected)
  })
})

describe("<RefundDialog>", () => {
  it("states the impact, validates against what is left and disables the button for a bad amount", async () => {
    renderWithQuery(
      <RefundDialog
        payment={payment}
        orderId="order000123"
        onClose={() => {}}
      />
    )
    expect(screen.getByText(/still refundable/)).toHaveTextContent("₹800")
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument()
    const button = screen.getByRole("button", { name: "Refund ₹800" })
    expect(button).toBeEnabled()
    const input = screen.getByLabelText(/amount/i)
    await userEvent.clear(input)
    await userEvent.type(input, "900")
    expect(screen.getByText(/at most ₹800/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /^Refund/ })).toBeDisabled()
  })

  it("sends ONE Idempotency-Key per dialog and a double click refunds once", async () => {
    const seen: { key: string | null; body: unknown }[] = []
    server.use(
      http.post(`${API}/admin/payments/pay1/refund`, async ({ request }) => {
        seen.push({
          key: request.headers.get("idempotency-key"),
          body: await request.json(),
        })
        await delay(50)
        return HttpResponse.json(ok({ refundedAmount: 500 }))
      })
    )
    const onClose = vi.fn()
    renderWithQuery(
      <RefundDialog payment={payment} orderId="order000123" onClose={onClose} />
    )
    const input = screen.getByLabelText(/amount/i)
    await userEvent.clear(input)
    await userEvent.type(input, "500")
    const button = screen.getByRole("button", { name: "Refund ₹500" })
    await userEvent.dblClick(button)
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    // The button disabled itself after the first click: the second click never became a request.
    expect(seen).toHaveLength(1)
    expect(seen[0].key).toMatch(/^[0-9a-f-]{36}$/)
    expect(seen[0].body).toEqual({ amount: 500, reason: "Refund by staff" })
  })

  it("a failed refund keeps the dialog open, shows the API's reason and RETRIES WITH THE SAME KEY", async () => {
    const keys: (string | null)[] = []
    let calls = 0
    server.use(
      http.post(`${API}/admin/payments/pay1/refund`, ({ request }) => {
        keys.push(request.headers.get("idempotency-key"))
        calls += 1
        return calls === 1
          ? HttpResponse.json(
              fail(
                "REFUND_IN_PROGRESS",
                "Another refund is being processed, try again"
              ),
              { status: 409 }
            )
          : HttpResponse.json(ok({ refundedAmount: 800 }))
      })
    )
    const onClose = vi.fn()
    renderWithQuery(
      <RefundDialog payment={payment} orderId="order000123" onClose={onClose} />
    )
    await userEvent.click(screen.getByRole("button", { name: "Refund ₹800" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Another refund is being processed"
    )
    expect(onClose).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Refund ₹800" }))
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1]) // same intent, same key: the server replays instead of refunding twice
  })
})
